// Pagos de reservas. Flujo:
//   admin pone precio → «Enviar presupuesto» genera /pago/<token> (no caduca)
//   → el cliente revisa y pulsa «Pagar» → se crea un checkout de SumUp (caduca a los 30 min)
//   → SumUp avisa por webhook → se comprueba SIEMPRE contra su API → reserva pagada.
// Se guardan todos los checkouts de cada reserva: si se crean varios, ninguno se pierde.
const crypto = require('node:crypto');

const today = () => new Date().toISOString().slice(0, 10);

function createPayments(db, sumup, { baseUrl }) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    checkout_id TEXT NOT NULL UNIQUE,
    checkout_url TEXT NOT NULL,
    amount_eur REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | PAID | FAILED | EXPIRED
    transaction_code TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
  `);
  const cols = db.prepare('PRAGMA table_info(bookings)').all().map(c => c.name);
  if (!cols.includes('pay_token')) db.exec('ALTER TABLE bookings ADD COLUMN pay_token TEXT');
  if (!cols.includes('quote_sent_at')) db.exec('ALTER TABLE bookings ADD COLUMN quote_sent_at TEXT');
  if (!cols.includes('paid_at')) db.exec('ALTER TABLE bookings ADD COLUMN paid_at TEXT');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_pay_token ON bookings(pay_token)');

  const q = {
    booking: db.prepare('SELECT * FROM bookings WHERE id = ?'),
    byToken: db.prepare('SELECT * FROM bookings WHERE pay_token = ?'),
    setToken: db.prepare(`UPDATE bookings SET pay_token = COALESCE(pay_token, ?), quote_sent_at = datetime('now'),
      payment_status = CASE WHEN payment_status IN ('sin_pago', 'fallido') THEN 'enlace_enviado' ELSE payment_status END WHERE id = ?`),
    reusable: db.prepare(`SELECT * FROM payments WHERE booking_id = ? AND status = 'PENDING' AND amount_eur = ?
      AND created_at > datetime('now', '-25 minutes') ORDER BY id DESC LIMIT 1`),
    insert: db.prepare('INSERT INTO payments (booking_id, checkout_id, checkout_url, amount_eur) VALUES (?, ?, ?, ?)'),
    byCheckout: db.prepare('SELECT * FROM payments WHERE checkout_id = ?'),
    update: db.prepare(`UPDATE payments SET status = ?, transaction_code = COALESCE(?, transaction_code), updated_at = datetime('now') WHERE id = ?`),
    markPaid: db.prepare(`UPDATE bookings SET payment_status = 'pagado', paid_at = datetime('now'),
      status = CASE WHEN status = 'pendiente' THEN 'pagada' ELSE status END WHERE id = ? AND payment_status != 'pagado'`),
    markFailed: db.prepare(`UPDATE bookings SET payment_status = 'fallido' WHERE id = ? AND payment_status != 'pagado'`),
    pendingOf: db.prepare(`SELECT checkout_id FROM payments WHERE booking_id = ? AND status = 'PENDING'`),
    recentPending: db.prepare(`SELECT checkout_id FROM payments WHERE status = 'PENDING' AND created_at > datetime('now', '-2 hours')`),
    last: db.prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY id DESC LIMIT 1'),
    all: db.prepare('SELECT * FROM payments ORDER BY id')
  };

  const payUrl = token => `${baseUrl}/pago/${token}`;

  // Motivo por el que no se puede pagar (o null si se puede)
  function blocker(b) {
    if (b.payment_status === 'pagado') return 'paid';
    if (b.status === 'cancelada') return 'cancelled';
    if (!(b.amount_eur > 0)) return 'no_price';
    if (b.date < today()) return 'past';
    return null;
  }

  // «Enviar presupuesto»: crea (o reutiliza) el enlace /pago/<token>
  function ensureQuote(bookingId) {
    const b = q.booking.get(bookingId);
    if (!b) throw new Error('Reserva no encontrada.');
    const why = blocker(b);
    if (why === 'paid') throw new Error('Esta reserva ya está pagada.');
    if (why === 'cancelled') throw new Error('La reserva está cancelada.');
    if (why === 'no_price') throw new Error('Pon primero el precio.');
    if (why === 'past') throw new Error('La fecha del servicio ya ha pasado.');
    q.setToken.run(crypto.randomBytes(24).toString('base64url'), bookingId);
    return payUrl(q.booking.get(bookingId).pay_token);
  }

  // Lo que ve el cliente en /pago/<token>: solo lo necesario, sin email ni teléfono
  function publicView(b) {
    const last = q.last.get(b.id);
    const processing = last?.status === 'PENDING';
    let state = blocker(b) || (last?.status === 'FAILED' ? 'failed' : 'ready');
    return {
      id: b.id, firstName: String(b.name).split(' ')[0],
      origin: b.origin, destination: b.destination, date: b.date, time: b.time,
      pax: b.pax, luggage: b.luggage, flight: b.flight || '',
      amount: b.amount_eur, state, processing
    };
  }

  async function startCheckout(b) {
    if (sumup.mode === 'off') throw new Error('El pago online no está disponible ahora mismo. Escríbenos por WhatsApp.');
    if (blocker(b)) throw new Error('Esta reserva no se puede pagar.');
    const amount = Number(b.amount_eur.toFixed(2));
    const existing = q.reusable.get(b.id, amount);
    if (existing) return existing.checkout_url;
    const { id, url } = await sumup.createCheckout({
      reference: `ALY-${b.id}-${Date.now()}`,
      amount,
      description: `Transfer ${b.origin} → ${b.destination} (${b.date} ${b.time})`.slice(0, 250),
      redirectUrl: `${payUrl(b.pay_token)}?vuelta=1`,
      webhookUrl: `${baseUrl}/api/sumup/webhook`
    });
    q.insert.run(b.id, id, url, amount);
    return url;
  }

  // Consulta el estado real en SumUp y lo aplica. Ignora checkouts que no son nuestros.
  async function syncCheckout(checkoutId) {
    const p = q.byCheckout.get(String(checkoutId));
    if (!p || sumup.mode === 'off') return null;
    const c = await sumup.getCheckout(p.checkout_id);
    if (!['PENDING', 'PAID', 'FAILED', 'EXPIRED'].includes(c.status)) return p.status;
    if (c.status !== p.status || c.transactionCode) q.update.run(c.status, c.transactionCode, p.id);
    if (c.status === 'PAID') {
      if (c.amount != null && Number(c.amount) !== p.amount_eur) console.warn(`⚠️  Pago ${p.checkout_id}: SumUp indica ${c.amount} € y esperábamos ${p.amount_eur} €`);
      if (q.markPaid.run(p.booking_id).changes) console.log(`💶 Reserva #${p.booking_id} pagada (${p.amount_eur} €, checkout ${p.checkout_id})`);
    } else if (c.status === 'FAILED') {
      q.markFailed.run(p.booking_id);
    }
    return c.status;
  }

  async function syncBooking(bookingId) {
    for (const { checkout_id } of q.pendingOf.all(bookingId)) await syncCheckout(checkout_id).catch(e => console.error(e.message));
  }

  // Red de seguridad por si algún webhook no llega
  async function syncRecent() {
    for (const { checkout_id } of q.recentPending.all()) await syncCheckout(checkout_id).catch(e => console.error(e.message));
  }
  if (sumup.mode !== 'off') setInterval(syncRecent, 5 * 60 * 1000).unref();

  function byBooking() {
    const map = {};
    for (const p of q.all.all()) (map[p.booking_id] ||= []).push(p);
    return map;
  }

  return { payUrl, ensureQuote, publicView, startCheckout, syncCheckout, syncBooking, byBooking, findByToken: t => q.byToken.get(t) };
}

module.exports = { createPayments };
