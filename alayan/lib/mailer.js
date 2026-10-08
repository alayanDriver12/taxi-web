// Emails transaccionales con Resend (API HTTPS: Railway Hobby bloquea el SMTP saliente).
// Sin RESEND_API_KEY funciona en «modo prueba»: no envía nada, solo lo registra en email_log.
// Docs: https://resend.com/docs/api-reference/emails/send-email

function createMailer(db, { apiKey, from, replyTo, siteUrl, brand }) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS email_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,          -- received | quote | paid | confirmed | cancelled | admin
    to_addr TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,        -- sent | failed | simulated
    error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_email_log_booking ON email_log(booking_id);
  `);
  const log = db.prepare('INSERT INTO email_log (booking_id, kind, to_addr, subject, status, error) VALUES (?, ?, ?, ?, ?, ?)');
  const mode = apiKey && from ? 'real' : 'test';

  // Nunca lanza: un fallo de email no debe romper una reserva ni un pago
  async function send({ to, subject, text, bookingId = null, kind, replyTo: rt }) {
    if (!to) return false;
    if (mode === 'test') {
      log.run(bookingId, kind, to, subject, 'simulated', null);
      console.log(`✉️  [email de prueba] ${kind} → ${to}: ${subject}`);
      return true;
    }
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, text, html: toHtml(text, siteUrl, brand), reply_to: rt || replyTo || undefined })
      });
      if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
      log.run(bookingId, kind, to, subject, 'sent', null);
      return true;
    } catch (e) {
      console.error('Email:', e.message);
      log.run(bookingId, kind, to, subject, 'failed', e.message.slice(0, 500));
      return false;
    }
  }

  const byBookingQ = db.prepare('SELECT booking_id, kind, to_addr, status, created_at FROM email_log WHERE booking_id IS NOT NULL ORDER BY id');
  function byBooking() {
    const map = {};
    for (const e of byBookingQ.all()) (map[e.booking_id] ||= []).push(e);
    return map;
  }

  return { mode, send, byBooking };
}

const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// HTML sencillo a partir del texto: saltos de línea, enlaces clicables y cabecera de marca
function toHtml(text, siteUrl, brand) {
  const body = escHtml(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#9a7b45">$1</a>')
    .replace(/\n/g, '<br>');
  return `<!DOCTYPE html><html><body style="margin:0;background:#f4f1ec;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
<div style="background:#0a0a0a;color:#c5a46a;padding:18px 24px;font-size:15px;letter-spacing:3px">${escHtml(brand)}</div>
<div style="padding:24px;color:#1a1a1a;font-size:15px;line-height:1.6">${body}</div>
<div style="padding:14px 24px;border-top:1px solid #eee;color:#888;font-size:12px"><a href="${escHtml(siteUrl)}" style="color:#888">${escHtml(siteUrl.replace(/^https?:\/\//, ''))}</a></div>
</div></body></html>`;
}

module.exports = { createMailer };
