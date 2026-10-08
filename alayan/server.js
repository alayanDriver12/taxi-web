const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const { createAuth, homeFor } = require('./lib/auth');
const { createContentStore, IMAGE_SLOTS } = require('./lib/content');

const {
  PORT = 3000, BASE_URL = `http://localhost:${PORT}`,
  ADMIN_USER = 'admin', ADMIN_PASS = '',
  SUMUP_API_KEY = '', SUMUP_MERCHANT_CODE = '',
  DB_PATH = './data/alayan.db',
  ALLOW_CLIENT_AMOUNT = 'false'
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

const auth = createAuth(db, { secure: BASE_URL.startsWith('https://') });
const content = createContentStore(db);

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

// SumUp
async function createCheckout(booking, amount) {
  if (!SUMUP_API_KEY || !SUMUP_MERCHANT_CODE) return null;
  const ref = `ALY-${booking.id}-${Date.now()}`;
  const r = await fetch('https://api.sumup.com/v0.1/checkouts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SUMUP_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      checkout_reference: ref, amount: Number(amount.toFixed(2)), currency: 'EUR',
      merchant_code: SUMUP_MERCHANT_CODE,
      description: `Transfer ${booking.origin} → ${booking.destination} (${booking.date})`,
      redirect_url: `${BASE_URL}/gracias.html?b=${booking.id}`,
      return_url: `${BASE_URL}/api/sumup/webhook`,
      hosted_checkout: { enabled: true }
    })
  });
  const data = await r.json();
  if (!r.ok) throw new Error('SumUp: ' + JSON.stringify(data));
  db.prepare(`UPDATE bookings SET checkout_id=?, checkout_url=?, amount_eur=?, payment_status='enlace_enviado' WHERE id=?`)
    .run(data.id, data.hosted_checkout_url, amount, booking.id);
  return data.hosted_checkout_url;
}

async function syncPayment(checkoutId) {
  const r = await fetch(`https://api.sumup.com/v0.1/checkouts/${encodeURIComponent(checkoutId)}`, {
    headers: { Authorization: `Bearer ${SUMUP_API_KEY}` }
  });
  const c = await r.json();
  if (c.status === 'PAID') db.prepare(`UPDATE bookings SET payment_status='pagado', status='pagada' WHERE checkout_id=? AND payment_status!='pagado'`).run(checkoutId);
  else if (c.status === 'FAILED') db.prepare(`UPDATE bookings SET payment_status='fallido' WHERE checkout_id=?`).run(checkoutId);
  return c.status;
}

// ---------- API pública ----------
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

app.post('/api/bookings', limiter, async (req, res) => {
  const b = req.body || {};
  const d = {
    name: clean(b.name, 100), company: clean(b.company, 100), phone: clean(b.phone, 30), email: clean(b.email, 120),
    origin: clean(b.origin), destination: clean(b.destination), date: clean(b.date, 10), time: clean(b.time, 5),
    pax: Math.min(Math.max(parseInt(b.pax) || 1, 1), 50), luggage: Math.min(Math.max(parseInt(b.luggage) || 0, 0), 50),
    flight: clean(b.flight, 60), sign: clean(b.sign, 100)
  };
  if (!d.name || !d.phone || !d.origin || !d.destination || !d.date || !d.time)
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  if (!/^\S+@\S+\.\S+$/.test(d.email)) return res.status(400).json({ error: 'Email no válido.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || d.date < new Date().toISOString().slice(0, 10))
    return res.status(400).json({ error: 'La fecha debe ser hoy o posterior.' });

  const info = db.prepare(`INSERT INTO bookings (name,company,phone,email,origin,destination,date,time,pax,luggage,flight,sign)
    VALUES (@name,@company,@phone,@email,@origin,@destination,@date,@time,@pax,@luggage,@flight,@sign)`).run(d);
  const booking = { id: info.lastInsertRowid, ...d };

  let checkoutUrl = null;
  try {
    // Por seguridad el precio lo fija el admin; solo se usa el importe del cliente si se activa expresamente
    const clientAmount = parseFloat(String(b.amount || '').replace(',', '.').replace(/[^\d.]/g, ''));
    if (ALLOW_CLIENT_AMOUNT === 'true' && clientAmount > 0) checkoutUrl = await createCheckout(booking, clientAmount);
  } catch (e) { console.error(e.message); }
  res.status(201).json({ id: booking.id, checkoutUrl });
});

app.post('/api/sumup/webhook', express.json(), async (req, res) => {
  try {
    const id = req.body?.id || req.body?.payload?.checkout_id;
    if (id && SUMUP_API_KEY) await syncPayment(id); // se verifica siempre contra la API de SumUp
  } catch (e) { console.error(e.message); }
  res.sendStatus(200);
});

app.get('/api/bookings/:id/status', async (req, res) => {
  const row = db.prepare('SELECT id, payment_status, status, checkout_id FROM bookings WHERE id=?').get(req.params.id);
  if (!row) return res.sendStatus(404);
  if (row.checkout_id && row.payment_status !== 'pagado' && SUMUP_API_KEY) await syncPayment(row.checkout_id).catch(() => {});
  const r = db.prepare('SELECT id, payment_status, status FROM bookings WHERE id=?').get(req.params.id);
  res.json(r);
});

app.get('/api/content', (req, res) => res.set('Cache-Control', 'no-cache').json(content.get()));

// ---------- Sesión ----------
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos.' } });

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
  res.json(db.prepare('SELECT * FROM bookings ORDER BY id DESC LIMIT 500').all());
});

panel.patch('/bookings/:id', async (req, res) => {
  const id = Number(req.params.id);
  const cur = db.prepare('SELECT * FROM bookings WHERE id=?').get(id);
  if (!cur) return res.sendStatus(404);
  const { status, notes, amount, createLink } = req.body || {};
  if (['pendiente','pagada','confirmada','cancelada'].includes(status)) db.prepare('UPDATE bookings SET status=? WHERE id=?').run(status, id);
  if (notes !== undefined) db.prepare('UPDATE bookings SET notes=? WHERE id=?').run(clean(notes, 1000), id);
  let link = cur.checkout_url;
  if (amount !== undefined && Number(amount) > 0) db.prepare('UPDATE bookings SET amount_eur=? WHERE id=?').run(Number(amount), id);
  if (createLink) {
    const amt = Number(amount ?? cur.amount_eur);
    if (!(amt > 0)) return res.status(400).json({ error: 'Indica un importe.' });
    try { link = await createCheckout(cur, amt); if (!link) return res.status(400).json({ error: 'SumUp no está configurado.' }); }
    catch (e) { return res.status(502).json({ error: e.message }); }
  }
  res.json({ ok: true, checkoutUrl: link });
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

app.use('/api/panel', panel);

// ---------- Páginas del panel ----------
const panelPage = file => (req, res) => res.set('Cache-Control', 'no-store').sendFile(path.join(PANEL_DIR, file));

app.get('/login', (req, res, next) => (req.user ? res.redirect(homeFor(req.user)) : next()), panelPage('login.html'));
app.get('/reservas', auth.requirePage('admin', 'gestor'), panelPage('reservas.html'));
app.get('/admin', auth.requirePage('admin'), panelPage('web.html'));
app.get('/admin/usuarios', auth.requirePage('admin'), panelPage('usuarios.html'));
app.use('/panel', express.static(path.join(PANEL_DIR, 'assets'), { maxAge: '1h' }));

// ---------- Web pública ----------
// El HTML se sirve con el contenido ya incrustado: sin parpadeo y bueno para SEO
let indexTemplate = null;
function renderIndex() {
  indexTemplate ??= fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
  const c = content.get();
  const json = JSON.stringify(c).replace(/</g, String.fromCharCode(92) + 'u003c'); // "<" escapado: un texto no puede cerrar el <script>
  return indexTemplate
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(c.seo.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(c.seo.description)}">`)
    .replace('<!--content-->', `<script>window.__ALAYAN_CONTENT__=${json}</script>`);
}

app.get(['/', '/index.html'], (req, res) => {
  try { res.set('Cache-Control', 'no-cache').type('html').send(renderIndex()); }
  catch (e) {
    if (e.code !== 'ENOENT') throw e;
    res.status(503).send('Falta compilar la web: ejecuta <code>npm run build</code>.');
  }
});

app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d' }));
app.use(express.static(DIST_DIR, { index: false, maxAge: '7d' }));
app.get('/health', (_, res) => res.send('ok'));

app.listen(PORT, () => console.log(`Alayan Driver en ${BASE_URL}  (panel: /login)`));
