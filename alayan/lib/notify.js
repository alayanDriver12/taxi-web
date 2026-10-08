// Avisos al cliente (email automático y WhatsApp en un clic) y a Alayan (email).
// Los textos salen del contenido editable (sección «Avisos al cliente» en /admin), en el idioma de la reserva.

const fill = (tpl, vars) => String(tpl ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

// wa.me necesita el número con prefijo: si es un móvil español de 9 cifras se añade 34
function waNumber(phone) {
  const d = String(phone || '').replace(/\D/g, '').replace(/^00/, '');
  return /^[67]\d{8}$/.test(d) ? '34' + d : d;
}

const KINDS = ['received', 'quote', 'paid', 'confirmed', 'cancelled'];

function createNotifier({ content, mailer, payments, baseUrl, notifyEmail }) {
  const langOf = b => (b.lang === 'EN' ? 'EN' : 'ES');
  const money = (n, L) => new Intl.NumberFormat(L === 'EN' ? 'en-GB' : 'es-ES', { style: 'currency', currency: 'EUR' }).format(n);

  // Extras pedidos (sillas, movilidad reducida…) en el idioma de la reserva
  function extrasText(b, t) {
    let e = {};
    try { e = JSON.parse(b.extras || '{}') || {}; } catch {}
    return Object.keys(t.booking.extras).filter(k => e[k])
      .map(k => (k === 'other' && e.otherText ? `${t.booking.extras[k]}: ${e.otherText}` : t.booking.extras[k])).join(', ');
  }

  function summary(b, t) {
    const p = t.payment;
    return [
      `• ${p.route}: ${b.origin} → ${b.destination}`,
      `• ${p.when}: ${b.date} · ${b.time}`,
      `• ${p.pax}: ${b.pax} · ${p.luggage}: ${b.luggage}`,
      b.flight ? `• ${p.flight}: ${b.flight}` : null,
      extrasText(b, t) ? `• ${t.booking.extrasTitle.toLowerCase()}: ${extrasText(b, t)}` : null
    ].filter(Boolean).join('\n');
  }

  // Asunto y texto de un aviso al cliente
  function message(kind, b) {
    const L = langOf(b), t = content.get()[L];
    const tpl = t.notify[kind];
    const vars = {
      id: b.id,
      name: String(b.name).split(' ')[0],
      amount: b.amount_eur > 0 ? money(b.amount_eur, L) : '',
      summary: summary(b, t),
      link: b.pay_token ? payments.payUrl(b.pay_token) + (L === 'EN' ? '?lang=en' : '') : baseUrl
    };
    return { subject: fill(tpl.subject, vars), text: `${fill(tpl.body, vars)}\n\n${t.notify.signature}` };
  }

  const adminEmail = () => notifyEmail || content.get().legal.email;

  function emailClient(kind, b) {
    const m = message(kind, b);
    return mailer.send({ to: b.email, subject: m.subject, text: m.text, bookingId: b.id, kind, replyTo: adminEmail() });
  }

  function whatsappUrl(kind, b) {
    return `https://wa.me/${waNumber(b.phone)}?text=${encodeURIComponent(message(kind, b).text)}`;
  }

  function emailAdmin(subject, lines, b) {
    return mailer.send({ to: adminEmail(), subject, text: lines.filter(Boolean).join('\n'), bookingId: b.id, kind: 'admin', replyTo: b.email });
  }

  // ---------- Eventos ----------
  async function bookingReceived(b) {
    // Con precio automático el cliente recibe ya el presupuesto con el enlace de pago
    await emailClient(b.pay_token ? 'quote' : 'received', b);
    await emailAdmin(`${b.pay_token ? 'Nueva reserva' : 'Nueva solicitud'} #${b.id}: ${b.origin} → ${b.destination} (${b.date} ${b.time})`, [
      `${b.pay_token ? "Nueva reserva con precio automático" : "Nueva solicitud de reserva"} #${b.id}`, '',
      `Cliente: ${b.name}${b.company ? ` (${b.company})` : ''}`,
      `Teléfono: ${b.phone}`, `Email: ${b.email}`, '',
      `Trayecto: ${b.origin} → ${b.destination}`,
      `Fecha: ${b.date} a las ${b.time}`,
      `Pasajeros: ${b.pax} · Maletas: ${b.luggage}`,
      b.flight && `Vuelo: ${b.flight}`,
      b.sign && `Cartel: ${b.sign}`,
      extrasText(b, content.get().ES) && `Extras: ${extrasText(b, content.get().ES)}`,
      `Idioma: ${langOf(b)}`, '',
      b.pay_token
        ? `Precio automático: ${money(b.amount_eur, 'ES')} (${b.tariff === 'T2' ? 'Tarifa 2' : 'Tarifa 1'}). El cliente ya tiene el enlace de pago. Panel: ${baseUrl}/reservas`
        : `Ponle precio y envía el presupuesto: ${baseUrl}/reservas`
    ], b);
  }

  async function bookingPaid(b) {
    await emailClient('paid', b);
    await emailAdmin(`Reserva #${b.id} pagada (${money(b.amount_eur, 'ES')})`, [
      `La reserva #${b.id} de ${b.name} está pagada.`, '',
      `Trayecto: ${b.origin} → ${b.destination}`,
      `Fecha: ${b.date} a las ${b.time}`, '',
      `Panel: ${baseUrl}/reservas`
    ], b);
  }

  return { KINDS, message, emailClient, whatsappUrl, bookingReceived, bookingPaid };
}

module.exports = { createNotifier };
