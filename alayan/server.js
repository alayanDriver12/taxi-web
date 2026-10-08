const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');

const {
  PORT = 3000, BASE_URL = `http://localhost:${PORT}`,
  ADMIN_USER = 'admin', ADMIN_PASS = '',
  SUMUP_API_KEY = '', SUMUP_MERCHANT_CODE = '',
  DB_PATH = './data/alayan.db',
  ALLOW_CLIENT_AMOUNT = 'false'
} = process.env;

if (!ADMIN_PASS) console.warn('⚠️  Define ADMIN_PASS en las variables de entorno para proteger /admin');

// ---------- Base de datos ----------
require('node:fs').mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
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

// ---------- App ----------
const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
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

// ---------- Admin ----------
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const [u, p] = Buffer.from(h.split(' ')[1] || '', 'base64').toString().split(':');
  const ok = ADMIN_PASS && u === ADMIN_USER && p && p.length === ADMIN_PASS.length &&
    crypto.timingSafeEqual(Buffer.from(p), Buffer.from(ADMIN_PASS));
  if (ok) return next();
  res.set('WWW-Authenticate', 'Basic realm="Alayan Admin"').status(401).send('Acceso restringido');
}

app.get('/api/admin/bookings', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM bookings ORDER BY id DESC LIMIT 500').all());
});

app.patch('/api/admin/bookings/:id', auth, async (req, res) => {
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

app.delete('/api/admin/bookings/:id', auth, (req, res) => {
  db.prepare('DELETE FROM bookings WHERE id=?').run(Number(req.params.id));
  res.json({ ok: true });
});

app.get('/api/admin/export.csv', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM bookings ORDER BY id DESC').all();
  const cols = rows[0] ? Object.keys(rows[0]) : ['id'];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  res.type('text/csv').attachment('reservas.csv').send('\ufeff' + [cols.join(','), ...rows.map(r => cols.map(c => q(r[c])).join(','))].join('\n'));
});

app.get('/admin', auth, (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d', index: 'index.html' }));
app.get('/health', (_, res) => res.send('ok'));

app.listen(PORT, () => console.log(`Alayan Driver en ${BASE_URL}  (admin: /admin)`));
