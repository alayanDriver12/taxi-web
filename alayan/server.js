const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const { createAuth, homeFor } = require('./lib/auth');
const { createContentStore, IMAGE_SLOTS } = require('./lib/content');
const { createSumUp } = require('./lib/sumup');
const { createPayments } = require('./lib/payments');
const { createMailer } = require('./lib/mailer');
const { createNotifier } = require('./lib/notify');
const { createBackups } = require('./lib/backup');
const { createPricing } = require('./lib/pricing');
const { createFleet } = require('./lib/fleet');

const {
  PORT = 3000, BASE_URL = `http://localhost:${PORT}`,
  ADMIN_USER = 'admin', ADMIN_PASS = '',
  SUMUP_API_KEY = '', SUMUP_MERCHANT_CODE = '',
  SUMUP_MOCK = 'false', // true = simular SumUp sin cuenta (desarrollo / staging). Se ignora si hay API key.
  RESEND_API_KEY = '', MAIL_FROM = '', // emails; sin clave se registran pero no se envían
  NOTIFY_EMAIL = '',                   // dónde recibe Alayan los avisos (por defecto, el email de «Datos legales»)
  R2_ACCOUNT_ID = '', R2_ACCESS_KEY_ID = '', R2_SECRET_ACCESS_KEY = '', R2_BUCKET = '', // copias en Cloudflare R2
  BEHIND_CLOUDFLARE = 'false', // true SOLO cuando el dominio pase por Cloudflare: usa la IP real del visitante
  DB_PATH = './data/alayan.db'
} = process.env;

const DIST_DIR = path.join(__dirname, 'dist');     // web compilada (npm run build)
const PANEL_DIR = path.join(__dirname, 'panel');   // páginas del panel interno
const UPLOADS_DIR = path.join(path.dirname(DB_PATH), 'uploads'); // imágenes subidas, en el volumen

// ---------- Base de datos ----------
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT NOT NULL, company TEXT, phone TEXT NOT NULL, email TEXT NOT NULL,
  origin TEXT NOT NULL, destination TEXT NOT NULL,
  date TEXT NOT NULL, time TEXT NOT NULL,
  pax INTEGER DEFAULT 2, luggage INTEGER DEFAULT 2,
  flight TEXT, sign TEXT,
  amount_eur REAL,
  status TEXT NOT NULL DEFAULT 'pendiente',   -- pendiente | pagada | confirmada | cancelada
  payment_status TEXT NOT NULL DEFAULT 'sin_pago', -- sin_pago | enlace_enviado | pagado | fallido
  checkout_id TEXT, checkout_url TEXT, notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
`);
// Columnas añadidas después: se crean en BBDD ya existentes
const bookingCols = db.prepare('PRAGMA table_info(bookings)').all().map(c => c.name);
if (!bookingCols.includes('privacy_accepted_at')) db.exec('ALTER TABLE bookings ADD COLUMN privacy_accepted_at TEXT'); // prueba de aceptación (RGPD)
if (!bookingCols.includes('lang')) db.exec("ALTER TABLE bookings ADD COLUMN lang TEXT NOT NULL DEFAULT 'ES'"); // idioma de los avisos
if (!bookingCols.includes('route_mode')) db.exec("ALTER TABLE bookings ADD COLUMN route_mode TEXT NOT NULL DEFAULT 'custom'"); // airport | route | custom
if (!bookingCols.includes('destination_id')) db.exec('ALTER TABLE bookings ADD COLUMN destination_id TEXT');
if (!bookingCols.includes('extras')) db.exec('ALTER TABLE bookings ADD COLUMN extras TEXT'); // JSON: sillas, movilidad reducida…
if (!bookingCols.includes('tariff')) db.exec('ALTER TABLE bookings ADD COLUMN tariff TEXT'); // T1 | T2 si el precio es automático

// Conservación (política de privacidad, apartado 4): las solicitudes que no llegaron a contratarse
// se borran a los 12 meses. Las pagadas o confirmadas se conservan por obligaciones contables y fiscales.
const purgeStale = db.prepare(`DELETE FROM bookings
  WHERE payment_status != 'pagado' AND status IN ('pendiente', 'cancelada')
    AND created_at < datetime('now', '-12 months')`);
function purgeStaleBookings() {
  const { changes } = purgeStale.run();
  if (changes) console.log(`🧹 Borradas ${changes} solicitudes no contratadas con más de 12 meses`);
}
purgeStaleBookings();
setInterval(purgeStaleBookings, 24 * 60 * 60 * 1000).unref();

const auth = createAuth(db, { secure: BASE_URL.startsWith('https://') });
const content = createContentStore(db);
const pricing = createPricing(db);
const fleet = createFleet(db);
const sumup = createSumUp({ apiKey: SUMUP_API_KEY, merchantCode: SUMUP_MERCHANT_CODE, mock: SUMUP_MOCK === 'true', baseUrl: BASE_URL });
const payments = createPayments(db, sumup, { baseUrl: BASE_URL, onPaid: b => notifier.bookingPaid(b) });
const mailer = createMailer(db, { apiKey: RESEND_API_KEY, from: MAIL_FROM, siteUrl: BASE_URL, brand: 'ALAYAN DRIVER' });
const notifier = createNotifier({ content, mailer, payments, baseUrl: BASE_URL, notifyEmail: NOTIFY_EMAIL });
console.log(mailer.mode === 'real' ? '✉️  Email: Resend conectado' : '✉️  Email: MODO PRUEBA — se registran en el panel pero no se envían (faltan RESEND_API_KEY y MAIL_FROM)');
const backups = createBackups(db, {
  dataDir: path.dirname(DB_PATH), uploadsDir: UPLOADS_DIR,
  r2: { accountId: R2_ACCOUNT_ID, accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, bucket: R2_BUCKET }
});
console.log(backups.mode === 'r2' ? '💾 Copias: Cloudflare R2, cada noche' : '💾 Copias: LOCALES en el volumen (configura R2_* para guardarlas fuera de Railway)');
console.log({
  real: '💳 SumUp: conectado (cobros reales)',
  mock: '🧪 SumUp: MODO SIMULACIÓN — no se cobra nada (SUMUP_MOCK=true)',
  off: '⚠️  SumUp: sin configurar (faltan SUMUP_API_KEY y SUMUP_MERCHANT_CODE): los clientes no podrán pagar online'
}[sumup.mode]);

// Primer arranque: el primer administrador sale de ADMIN_USER / ADMIN_PASS
if (!auth.countUsers()) {
  if (ADMIN_PASS) {
    try {
      auth.createUser({ username: ADMIN_USER, name: 'Administrador', role: 'admin', password: ADMIN_PASS });
      console.log(`👤 Creado el usuario administrador "${ADMIN_USER}" a partir de ADMIN_USER / ADMIN_PASS`);
    } catch (e) {
      console.error(`⚠️  No se pudo crear el administrador inicial: ${e.message}`);
    }
  } else {
    console.warn('⚠️  No hay usuarios. Define ADMIN_USER y ADMIN_PASS (mín. 8 caracteres) para crear el primer administrador.');
  }
}

// ---------- App ----------
const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use('/api/panel', express.json({ limit: '300kb' })); // el contenido de la web pesa más que una reserva
app.use(express.json({ limit: '50kb' }));

const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------- API pública ----------
// IP del visitante para los límites de peticiones. Detrás de Cloudflare, req.ip sería la de Cloudflare (todos
// compartirían límite), así que se usa la cabecera que pone Cloudflare. Solo es fiable si TODO el tráfico pasa
// por Cloudflare: por eso se activa a mano con BEHIND_CLOUDFLARE=true.
const clientIp = BEHIND_CLOUDFLARE === 'true' ? req => req.headers['cf-connecting-ip'] || req.ip : req => req.ip;
const limit = opts => rateLimit({ windowMs: 15 * 60 * 1000, standardHeaders: true, legacyHeaders: false, keyGenerator: clientIp, ...opts });

const limiter = limit({ max: 20 });

const EXTRAS = ['booster', 'baby', 'child', 'pmr', 'other'];

// Tres tipos de reserva:
//  airport → aeropuerto ↔ Sevilla, precio fijo          → paga al momento
//  route   → Sevilla ↔ destino de la tabla, precio por km → paga al momento
//  custom  → trayecto libre                              → presupuesto (el admin pone el precio)
// El precio lo calcula siempre el servidor (pricing.quote); lo que mande el navegador se ignora.
app.post('/api/bookings', limiter, async (req, res) => {
  const b = req.body || {};
  const mode = ['airport', 'route', 'custom'].includes(b.mode) ? b.mode : 'custom';
  const extras = Object.fromEntries(EXTRAS.filter(k => b.extras?.[k] === true).map(k => [k, true]));
  if (extras.other) extras.otherText = clean(b.extrasOther, 200);
  const d = {
    name: clean(b.name, 100), company: clean(b.company, 100), phone: clean(b.phone, 30), email: clean(b.email, 120),
    date: clean(b.date, 10), time: clean(b.time, 5),
    pax: parseInt(b.pax) || 1, luggage: Math.min(Math.max(parseInt(b.luggage) || 0, 0), 50),
    flight: clean(b.flight, 60), sign: clean(b.sign, 100),
    lang: b.lang === 'EN' ? 'EN' : 'ES',
    route_mode: mode, destination_id: null, extras: Object.keys(extras).length ? JSON.stringify(extras) : null,
    amount_eur: null, tariff: null
  };
  if (!d.name || !d.phone || !d.date || !d.time) return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  if (b.privacy !== true) return res.status(400).json({ error: 'Debes aceptar la política de privacidad y las condiciones del servicio.' });
  if (!/^\S+@\S+\.\S+$/.test(d.email)) return res.status(400).json({ error: 'Email no válido.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || d.date < new Date().toISOString().slice(0, 10))
    return res.status(400).json({ error: 'La fecha debe ser hoy o posterior.' });
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)) return res.status(400).json({ error: 'Hora no válida.' });

  const p = pricing.get();
  const at = (place, addr) => (addr ? `${place} — ${addr}` : place);
  const address = clean(b.address, 150), addressDest = clean(b.addressDest, 150);
  let q;
  try {
    q = pricing.quote({ mode, destinationId: clean(b.destinationId, 80), pax: d.pax, pmr: !!extras.pmr, extras, date: d.date, time: d.time });
  } catch (e) { return res.status(400).json({ error: e.message }); }

  if (mode === 'airport') {
    const toAirport = b.direction === 'toAirport';
    [d.origin, d.destination] = toAirport ? [at(p.airport.city, address), p.airport.name] : [p.airport.name, at(p.airport.city, address)];
  } else if (mode === 'route') {
    const sevilla = at(p.airport.city, address), place = at(q.destination.name, addressDest);
    [d.origin, d.destination] = b.direction === 'toSevilla' ? [place, sevilla] : [sevilla, place];
    d.destination_id = q.destination.id;
  } else {
    d.origin = clean(b.origin); d.destination = clean(b.destination);
    if (!d.origin || !d.destination) return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }
  if (q) { d.amount_eur = q.amount; d.tariff = q.tariff; }

  const info = db.prepare(`INSERT INTO bookings (name,company,phone,email,origin,destination,date,time,pax,luggage,flight,sign,lang,
      route_mode,destination_id,extras,amount_eur,tariff,privacy_accepted_at)
    VALUES (@name,@company,@phone,@email,@origin,@destination,@date,@time,@pax,@luggage,@flight,@sign,@lang,
      @route_mode,@destination_id,@extras,@amount_eur,@tariff,datetime('now'))`).run(d);
  const id = info.lastInsertRowid;
  // Con precio automático se crea ya el enlace de pago y el cliente va directo a pagar
  const payUrl = q ? payments.ensureQuote(id) : null;
  res.status(201).json({ id, payUrl, amount: d.amount_eur, tariff: d.tariff });
  notifier.bookingReceived(db.prepare('SELECT * FROM bookings WHERE id=?').get(id)).catch(e => console.error(e));
});

// Precio orientativo para la web (el que vale es el que calcula la reserva)
app.post('/api/quote', limit({ max: 300 }), (req, res) => {
  const b = req.body || {};
  try {
    const q = pricing.quote({ mode: b.mode, destinationId: clean(b.destinationId, 80), pax: parseInt(b.pax) || 1, pmr: b.extras?.pmr === true || b.pmr === true, extras: b.extras && typeof b.extras === 'object' ? b.extras : {}, date: clean(b.date, 10), time: clean(b.time, 5) });
    res.json(q ? { amount: q.amount, extrasAmount: q.extrasAmount, tariff: q.tariff } : { amount: null });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// SumUp avisa de cambios de estado. No nos fiamos del cuerpo: se consulta siempre su API.
app.post('/api/sumup/webhook', async (req, res) => {
  try {
    const id = req.body?.id || req.body?.payload?.checkout_id;
    if (id) await payments.syncCheckout(id);
  } catch (e) { console.error('Webhook SumUp:', e.message); }
  res.sendStatus(200);
});

// Página de pago del cliente. El token (32 caracteres aleatorios) es la única «llave».
const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;
const payLimiter = limit({ max: 60 });

function bookingByToken(req, res) {
  const b = TOKEN_RE.test(req.params.token) && payments.findByToken(req.params.token);
  if (!b) res.status(404).json({ error: 'not_found' });
  return b || null;
}

app.get('/api/pay/:token', payLimiter, async (req, res) => {
  let b = bookingByToken(req, res);
  if (!b) return;
  if (b.payment_status !== 'pagado') {
    await payments.syncBooking(b.id); // por si vuelve de SumUp antes de que llegue el webhook
    b = payments.findByToken(req.params.token);
  }
  res.set('Cache-Control', 'no-store').json(payments.publicView(b));
});

app.post('/api/pay/:token/checkout', payLimiter, async (req, res) => {
  const b = bookingByToken(req, res);
  if (!b) return;
  if (req.body?.accept !== true) return res.status(400).json({ error: 'Debes aceptar el precio y las condiciones del servicio.' });
  if (sumup.mode === 'off') return res.status(503).json({ code: 'unavailable' });
  try { res.json({ url: await payments.startCheckout(b) }); }
  catch (e) {
    const fromSumUp = e.message.startsWith('SumUp');
    if (fromSumUp) console.error('Checkout SumUp:', e.message);
    res.status(fromSumUp ? 502 : 400).json({ error: fromSumUp ? 'No se pudo iniciar el pago. Inténtalo de nuevo en unos minutos.' : e.message });
  }
});

// Simulador de SumUp (solo con SUMUP_MOCK=true y sin API key)
if (sumup.mode === 'mock') {
  app.get('/sumup-simulado/:id', (req, res) => {
    const c = sumup.checkouts.get(req.params.id);
    if (!c) return res.status(404).send('Checkout simulado no encontrado (¿se reinició el servidor?).');
    res.type('html').send(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SumUp simulado</title><style>body{font:16px system-ui;background:#eef1f5;margin:0;display:grid;place-items:center;min-height:100vh;padding:16px}
.c{background:#fff;border-radius:14px;padding:28px;max-width:420px;width:100%;box-shadow:0 10px 40px #0002}.w{background:#fff3cd;border:1px solid #e0c56b;padding:10px;border-radius:8px;font-size:13px}
h1{font-size:20px}b{font-size:28px;display:block;margin:8px 0 20px}button{width:100%;padding:12px;border:0;border-radius:8px;font-size:15px;margin-top:8px;cursor:pointer}
.ok{background:#1a73e8;color:#fff}.ko{background:#eee}</style></head><body><div class="c">
<p class="w">🧪 <b style="display:inline;font-size:13px">SIMULADOR</b> — Esto no es SumUp y no se cobra nada. Sirve para probar la web sin cuenta.</p>
<h1>${esc(c.description)}</h1><b>${Number(c.amount).toFixed(2).replace('.', ',')} €</b>
<form method="post"><button class="ok" name="r" value="PAID">Simular pago correcto</button><button class="ko" name="r" value="FAILED">Simular pago rechazado</button></form>
</div></body></html>`);
  });
  app.post('/sumup-simulado/:id', express.urlencoded({ extended: false }), async (req, res) => {
    const c = sumup.checkouts.get(req.params.id);
    if (!c) return res.sendStatus(404);
    if (c.status === 'PENDING' && ['PAID', 'FAILED'].includes(req.body.r)) c.status = req.body.r;
    await payments.syncCheckout(req.params.id); // lo que haría el webhook real
    res.redirect(c.redirectUrl);
  });
}

// Todo lo que necesita la web: textos, tarifas (con precios calculados) y flota
const siteData = () => ({ ...content.get(), pricing: pricing.publicView(), fleet: fleet.get() });

app.get('/api/content', (req, res) => res.set('Cache-Control', 'no-cache').json(siteData()));

// ---------- Sesión ----------
const loginLimiter = limit({ max: 10, skipSuccessfulRequests: true, message: { error: 'Demasiados intentos. Espera unos minutos.' } });

app.use(['/api/auth', '/api/panel', '/login', '/reservas', '/admin'], auth.loadUser);

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const user = auth.login(req.body?.username, req.body?.password);
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  auth.startSession(res, user);
  res.json({ ok: true, home: homeFor(user) });
});

app.post('/api/auth/logout', (req, res) => { auth.endSession(req, res); res.json({ ok: true }); });

app.get('/api/auth/me', auth.requireApi(), (req, res) => res.json(req.user));

app.post('/api/auth/password', auth.requireApi(), (req, res) => {
  try { auth.changeOwnPassword(req, req.body?.current, req.body?.next); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ---------- API del panel ----------
const panel = express.Router();
panel.use(auth.requireApi()); // cualquier usuario con sesión: admin o gestor
const adminOnly = auth.requireApi('admin');

// Reservas
panel.get('/bookings', (req, res) => {
  const rows = db.prepare('SELECT * FROM bookings ORDER BY id DESC LIMIT 500').all();
  const pays = payments.byBooking(), mails = mailer.byBooking();
  res.json({
    sumupMode: sumup.mode,
    mailMode: mailer.mode,
    bookings: rows.map(row => {
      const { checkout_id, checkout_url, pay_token, ...r } = row;
      return {
        ...r,
        payUrl: pay_token ? payments.payUrl(pay_token) : null,
        waQuote: pay_token && r.amount_eur > 0 ? notifier.whatsappUrl('quote', row) : null,
        payments: pays[r.id] || [],
        emails: mails[r.id] || []
      };
    })
  });
});

panel.patch('/bookings/:id', (req, res) => {
  const id = Number(req.params.id);
  const cur = db.prepare('SELECT * FROM bookings WHERE id=?').get(id);
  if (!cur) return res.sendStatus(404);
  const { status, notes, amount } = req.body || {};
  if (amount !== undefined) {
    if (cur.payment_status === 'pagado') return res.status(400).json({ error: 'La reserva ya está pagada: el precio no se puede cambiar.' });
    const n = Math.round(Number(String(amount).replace(',', '.')) * 100) / 100;
    if (!(n > 0 && n < 100000)) return res.status(400).json({ error: 'Precio no válido.' });
    db.prepare('UPDATE bookings SET amount_eur=? WHERE id=?').run(n, id);
  }
  if (['pendiente','pagada','confirmada','cancelada'].includes(status)) db.prepare('UPDATE bookings SET status=? WHERE id=?').run(status, id);
  if (notes !== undefined) db.prepare('UPDATE bookings SET notes=? WHERE id=?').run(clean(notes, 1000), id);
  res.json({ ok: true });
});

// «Enviar presupuesto»: crea el enlace /pago/<token>, lo manda por email y devuelve el WhatsApp ya redactado
panel.post('/bookings/:id/quote', async (req, res) => {
  const id = Number(req.params.id);
  let url;
  try { url = payments.ensureQuote(id); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  const b = db.prepare('SELECT * FROM bookings WHERE id=?').get(id);
  const emailed = req.body?.email === false ? false : await notifier.emailClient('quote', b);
  res.json({ url, emailed, wa: notifier.whatsappUrl('quote', b) });
});

// Avisar al cliente de un cambio (confirmada, cancelada…): email al momento + WhatsApp redactado
panel.post('/bookings/:id/notify', async (req, res) => {
  const b = db.prepare('SELECT * FROM bookings WHERE id=?').get(Number(req.params.id));
  if (!b) return res.sendStatus(404);
  const kind = req.body?.kind;
  if (!notifier.KINDS.includes(kind)) return res.status(400).json({ error: 'Tipo de aviso no válido.' });
  if (kind === 'quote' && !b.pay_token) return res.status(400).json({ error: 'Envía primero el presupuesto.' });
  const emailed = req.body?.email ? await notifier.emailClient(kind, b) : false;
  res.json({ emailed, wa: notifier.whatsappUrl(kind, b) });
});

panel.post('/bookings/:id/sync', async (req, res) => {
  await payments.syncBooking(Number(req.params.id));
  res.json({ ok: true });
});

panel.delete('/bookings/:id', adminOnly, (req, res) => {
  db.prepare('DELETE FROM bookings WHERE id=?').run(Number(req.params.id));
  res.json({ ok: true });
});

panel.get('/bookings.csv', (req, res) => {
  const rows = db.prepare('SELECT * FROM bookings ORDER BY id DESC').all();
  const cols = rows[0] ? Object.keys(rows[0]) : ['id'];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  res.type('text/csv').attachment('reservas.csv').send(String.fromCharCode(0xfeff) + [cols.join(','), ...rows.map(r => cols.map(c => q(r[c])).join(','))].join('\n'));
});

// Contenido de la web
const contentResponse = () => ({ content: content.get(), defaults: content.defaults, meta: content.meta() });

panel.get('/content', adminOnly, (req, res) => res.json(contentResponse()));

panel.put('/content', adminOnly, (req, res) => {
  try { content.saveTexts(req.body || {}, req.user.username); res.json(contentResponse()); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

panel.post('/content/reset', adminOnly, (req, res) => {
  content.resetTexts(req.user.username);
  res.json(contentResponse());
});

// Imágenes: se suben en crudo (Content-Type: image/...) y se guardan en el volumen
const IMAGE_TYPES = [
  { ext: 'jpg', test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', test: b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'webp', test: b => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' }
];

function removeUpload(url) {
  if (!url?.startsWith('/uploads/')) return;
  fs.rm(path.join(UPLOADS_DIR, path.basename(url)), { force: true }, () => {});
}

panel.post('/images/:slot', adminOnly, express.raw({ type: 'image/*', limit: '8mb' }), (req, res) => {
  const { slot } = req.params;
  if (!IMAGE_SLOTS.includes(slot)) return res.status(404).json({ error: 'Imagen desconocida.' });
  const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const type = IMAGE_TYPES.find(t => t.test(buf));
  if (!type) return res.status(400).json({ error: 'Formato no válido. Usa JPG, PNG o WebP.' });
  const file = `${slot}-${Date.now()}.${type.ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, file), buf);
  const previous = content.get().images[slot];
  content.setImage(slot, `/uploads/${file}`, req.user.username);
  removeUpload(previous);
  res.json(contentResponse());
});

panel.delete('/images/:slot', adminOnly, (req, res) => {
  const { slot } = req.params;
  if (!IMAGE_SLOTS.includes(slot)) return res.status(404).json({ error: 'Imagen desconocida.' });
  const previous = content.get().images[slot];
  content.setImage(slot, null, req.user.username);
  removeUpload(previous);
  res.json(contentResponse());
});

// Usuarios
panel.get('/users', adminOnly, (req, res) => res.json(auth.listUsers()));

panel.post('/users', adminOnly, (req, res) => {
  try { const id = auth.createUser(req.body || {}); res.status(201).json({ ok: true, id }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

panel.patch('/users/:id', adminOnly, (req, res) => {
  const { name, role, active, password } = req.body || {};
  try { auth.updateUser(Number(req.params.id), { name, role, active, password }, req.user); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

panel.delete('/users/:id', adminOnly, (req, res) => {
  try { auth.deleteUser(Number(req.params.id), req.user); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// Tarifas
const pricingResponse = () => ({ pricing: pricing.get(), preview: pricing.publicView().destinations, meta: pricing.meta() });
panel.get('/pricing', adminOnly, (req, res) => res.json(pricingResponse()));
panel.put('/pricing', adminOnly, (req, res) => {
  try { pricing.save(req.body || {}, req.user.username); res.json(pricingResponse()); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
panel.post('/pricing/reset', adminOnly, (req, res) => { pricing.reset(req.user.username); res.json(pricingResponse()); });

// Flota: textos y orden de los coches, y sus fotos (varias por coche)
panel.get('/fleet', adminOnly, (req, res) => res.json({ fleet: fleet.get(), maxImages: fleet.MAX_IMAGES }));
panel.put('/fleet', adminOnly, (req, res) => {
  const before = fleet.get().flatMap(c => c.images);
  const after = fleet.saveCars(req.body?.fleet, req.user.username);
  const kept = new Set(after.flatMap(c => c.images));
  before.filter(u => !kept.has(u)).forEach(removeUpload); // fotos quitadas: se borran del disco
  res.json({ fleet: after, maxImages: fleet.MAX_IMAGES });
});
panel.post('/fleet/:id/images', adminOnly, express.raw({ type: 'image/*', limit: '8mb' }), (req, res) => {
  const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const type = IMAGE_TYPES.find(t => t.test(buf));
  if (!type) return res.status(400).json({ error: 'Formato no válido. Usa JPG, PNG o WebP.' });
  if (!/^[a-z0-9-]{1,40}$/.test(req.params.id)) return res.status(404).json({ error: 'Vehículo no encontrado.' });
  const file = `car-${req.params.id}-${Date.now()}.${type.ext}`;
  try {
    fs.writeFileSync(path.join(UPLOADS_DIR, file), buf);
    res.json({ fleet: fleet.addImage(req.params.id, `/uploads/${file}`, req.user.username), maxImages: fleet.MAX_IMAGES });
  } catch (e) {
    fs.rm(path.join(UPLOADS_DIR, file), { force: true }, () => {});
    res.status(400).json({ error: e.message });
  }
});

// Copias de seguridad
panel.get('/backup', adminOnly, (req, res) => res.json({ mode: backups.mode, last: backups.status() }));
panel.post('/backup', adminOnly, async (req, res) => {
  const result = await backups.run(`manual (${req.user.username})`);
  res.status(result.ok ? 200 : 502).json({ mode: backups.mode, last: result, error: result.ok ? undefined : result.error });
});

app.use('/api/panel', panel);

// ---------- Páginas del panel ----------
const panelPage = file => (req, res) => res.set('Cache-Control', 'no-store').sendFile(path.join(PANEL_DIR, file));

app.get('/login', (req, res, next) => (req.user ? res.redirect(homeFor(req.user)) : next()), panelPage('login.html'));
app.get('/reservas', auth.requirePage('admin', 'gestor'), panelPage('reservas.html'));
app.get('/admin', auth.requirePage('admin'), panelPage('web.html'));
app.get('/admin/usuarios', auth.requirePage('admin'), panelPage('usuarios.html'));
// Icono de pestaña: el logo actual (los navegadores lo piden aunque no se enlace)
app.get('/favicon.ico', (req, res) => res.redirect(302, content.get().images.logo));
app.get('/admin/tarifas', auth.requirePage('admin'), panelPage('tarifas.html'));
app.get('/admin/flota', auth.requirePage('admin'), panelPage('flota.html'));
app.use('/panel', express.static(path.join(PANEL_DIR, 'assets'), { maxAge: '1h' }));

// ---------- Web pública ----------
// El HTML se sirve con el contenido ya incrustado: sin parpadeo y bueno para SEO
let indexTemplate = null;
function renderIndex(pageTitle) {
  // En producción se lee una vez; en local se relee para que un `npm run build` se vea sin reiniciar
  if (!indexTemplate || process.env.NODE_ENV !== 'production') indexTemplate = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
  const c = siteData();
  const json = JSON.stringify(c).replace(/</g, String.fromCharCode(92) + 'u003c'); // "<" escapado: un texto no puede cerrar el <script>
  const title = pageTitle ? `${pageTitle} · ${c.ES.brand.name}` : c.seo.title;
  return indexTemplate
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(c.seo.description)}">`)
    .replace('<!--content-->', `<script>window.__ALAYAN_CONTENT__=${json}</script>`);
}

// Páginas legales: las pinta la misma app React según la ruta (web/src/Legal.jsx)
const LEGAL_PAGES = { '/aviso-legal': 'notice', '/privacidad': 'privacy', '/cookies': 'cookies', '/condiciones': 'terms' };

function sendIndex(res, title) {
  try { res.type('html').send(renderIndex(title)); }
  catch (e) {
    if (e.code !== 'ENOENT') throw e;
    res.status(503).send('Falta compilar la web: ejecuta <code>npm run build</code>.');
  }
}

app.get(['/', '/index.html', ...Object.keys(LEGAL_PAGES)], (req, res) => {
  const legalKey = LEGAL_PAGES[req.path.replace(/[/]+$/, '')];
  res.set('Cache-Control', 'no-cache');
  sendIndex(res, legalKey && content.get().ES.footer.legal[legalKey]);
});

// Página de pago (la pinta React: web/src/Pay.jsx). Privada: que no la indexe nadie.
app.get('/pago/:token', (req, res) => {
  res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
  sendIndex(res, content.get().ES.payment.title);
});

app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d' }));
app.use(express.static(DIST_DIR, { index: false, maxAge: '7d' }));
app.get('/health', (_, res) => res.send('ok'));

app.listen(PORT, () => console.log(`Alayan Driver en ${BASE_URL}  (panel: /login)`));
