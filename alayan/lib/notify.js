// Avisos al cliente (email automático y WhatsApp en un clic) y a Alayan (email).
// Los textos salen del contenido editable (sección «Avisos al cliente» en /admin), en el idioma de la reserva.

const { renderEmail, renderPlain, bodyHtml, summaryCard, button } = require('./emailTemplate');

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
      extrasText(b, t) ? `• ${t.booking.extrasTitle.toLowerCase()}: ${extrasText(b, t)}` : null,
      b.amount_eur > 0 ? `• ${p.total}: ${money(b.amount_eur, langOf(b))}` : null
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
    const subject = fill(tpl.subject, vars);
    return { subject, text: `${fill(tpl.body, vars)}\n\n${t.notify.signature}`, html: htmlMessage(kind, b, t, L, vars, subject) };
  }

  // ---------- HTML (diseño en lib/emailTemplate.js) ----------
  const absolute = u => (/^https?:/.test(u) ? u : baseUrl + u);
  const longDate = (d, L) => {
    const x = new Date(`${d}T12:00:00Z`);
    if (Number.isNaN(x.getTime())) return d;
    const s = x.toLocaleDateString(L === 'EN' ? 'en-GB' : 'es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  // Cabecera y pie comunes: logo, contacto, datos del titular y enlaces legales
  function chrome(t, L) {
    const c = content.get(), lg = c.legal, q = L === 'EN' ? '?lang=en' : '';
    return {
      logoUrl: absolute(c.images.logo),
      brand: t.brand.name,
      tagline: t.brand.tagline,
      footer: {
        help: t.notify.help,
        review: c.contact.reviewUrl ? { text: t.notify.review, label: t.notify.reviewButton, url: c.contact.reviewUrl } : null,
        signature: t.notify.signature,
        waUrl: c.contact.whatsapp ? `https://wa.me/${c.contact.whatsapp}` : '',
        phone: lg.phone,
        legal: [lg.owner, lg.nif && `NIF ${lg.nif}`, lg.address].filter(Boolean).join(' · '),
        links: [
          { href: baseUrl + '/privacidad' + q, label: t.footer.legal.privacy },
          { href: baseUrl + '/condiciones' + q, label: t.footer.legal.terms }
        ]
      }
    };
  }

  function htmlMessage(kind, b, t, L, vars, subject) {
    const p = t.payment;
    const card = summaryCard([
      [p.route, `${b.origin} → ${b.destination}`],
      [p.when, `${longDate(b.date, L)} · ${b.time}`],
      [p.pax, `${b.pax} · ${p.luggage}: ${b.luggage}`],
      [p.flight, b.flight],
      [t.booking.extrasTitle, extrasText(b, t)]
    ], b.amount_eur > 0 ? [p.total, vars.amount] : null);
    const label = kind === 'quote' && b.amount_eur > 0 ? fill(t.notify.button.pay, vars) : t.notify.button.view;
    // Los demás {huecos} se rellenan; {summary} y {link} en su propia línea pasan a ser tarjeta y botón
    const body = fill(t.notify[kind].body, { ...vars, summary: '{summary}', link: '{link}' });
    const html = bodyHtml(body, { '{summary}': card, '{link}': button(vars.link, label) })
      .replace(/[{]summary[}]/g, '')
      .replace(/[{]link[}]/g, `<a href="${vars.link}" style="color:#9a7b45">${vars.link}</a>`);
    return renderEmail({ lang: L, preheader: subject, content: html, ...chrome(t, L) });
  }

  const adminEmail = () => notifyEmail || content.get().legal.email;

  function emailClient(kind, b) {
    const m = message(kind, b);
    return mailer.send({ to: b.email, subject: m.subject, text: m.text, html: m.html, bookingId: b.id, kind, replyTo: adminEmail() });
  }

  function whatsappUrl(kind, b) {
    return `https://wa.me/${waNumber(b.phone)}?text=${encodeURIComponent(message(kind, b).text)}`;
  }

  function emailAdmin(subject, lines, b) {
    const text = lines.filter(Boolean).join('\n');
    const { footer, ...head } = chrome(content.get().ES, 'ES'); // aviso interno: sin pie para clientes
    return mailer.send({ to: adminEmail(), subject, text, html: renderPlain({ text, ...head }), bookingId: b.id, kind: 'admin', replyTo: b.email || undefined });
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

  // Reserva de un hotel o empresa (a cuenta): confirmación a la empresa y aviso a Alayan
  async function companyBooking(b, company) {
    const t = content.get().ES, p = t.payment;
    const price = b.amount_eur > 0 ? money(b.amount_eur, 'ES') : 'a presupuesto (os lo confirmamos)';
    if (company.email) {
      const card = summaryCard([
        ['Huésped', `${b.name} · ${b.phone}`],
        [p.route, `${b.origin} → ${b.destination}`],
        [p.when, `${longDate(b.date, 'ES')} · ${b.time}`],
        [p.pax, `${b.pax} · ${p.luggage}: ${b.luggage}`],
        [p.flight, b.flight],
        [t.booking.extrasTitle, extrasText(b, t)]
      ], ['Importe a cuenta', price]);
      const content_ = `<p style="margin:0 0 14px;font-family:Georgia,serif;font-size:26px;color:#141210">Hola, ${company.name.replace(/[<>&]/g, '')}:</p>
<p style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#2b2723">Hemos registrado la reserva <b>#${b.id}</b> de vuestro cliente. No hay que pagar nada ahora: se incluirá en el resumen de fin de mes.</p>
${card}
<p style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#2b2723">Si hay que cambiar algo, responded a este email o escribidnos por WhatsApp.</p>`;
      const text = [`Hola, ${company.name}:`, '', `Hemos registrado la reserva #${b.id} de vuestro cliente (a cuenta, se incluirá en el resumen de fin de mes).`, '', summary(b, t), `• Importe: ${price}`, '', t.notify.signature].join('\n');
      await mailer.send({ to: company.email, subject: `Reserva #${b.id} registrada: ${b.date} ${b.time} · ${b.name}`, text, html: renderEmail({ preheader: `Reserva #${b.id} registrada`, content: content_, ...chrome(t, 'ES') }), bookingId: b.id, kind: 'company', replyTo: adminEmail() });
    }
    await emailAdmin(`Nueva reserva de ${company.name} #${b.id}: ${b.origin} → ${b.destination} (${b.date} ${b.time})`, [
      `Nueva reserva A CUENTA de ${company.name} #${b.id}`, '',
      `Huésped: ${b.name} · ${b.phone}${b.email ? ' · ' + b.email : ''}`,
      `Trayecto: ${b.origin} → ${b.destination}`,
      `Fecha: ${b.date} a las ${b.time}`,
      `Pasajeros: ${b.pax} · Maletas: ${b.luggage}`,
      b.flight && `Vuelo: ${b.flight}`,
      b.sign && `Cartel: ${b.sign}`,
      extrasText(b, t) && `Extras: ${extrasText(b, t)}`, '',
      b.amount_eur > 0 ? `Importe: ${money(b.amount_eur, 'ES')} (a cuenta: se cobra con el resumen mensual)` : `Sin precio automático: ponle precio en el panel.`,
      `Panel: ${baseUrl}/reservas · Resumen de la empresa: ${baseUrl}/admin/empresas`
    ], b);
  }

  return { KINDS, message, emailClient, whatsappUrl, bookingReceived, bookingPaid, companyBooking };
}

module.exports = { createNotifier };
