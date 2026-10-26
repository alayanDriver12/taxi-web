// Pruebas de extremo a extremo: arranca el servidor con una BBDD temporal y SumUp simulado,
// recorre reservas, precios, pagos, panel y permisos, y lo apaga. Uso: npm test
// No envía emails ni cobra nada (sin RESEND_API_KEY ni SUMUP_API_KEY).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = 3900 + Math.floor(Math.random() * 90);
const B = `http://localhost:${PORT}`;
const TMP = mkdtempSync(path.join(tmpdir(), 'alayan-test-'));

let fails = 0, passes = 0;
const ok = (cond, msg) => { cond ? passes++ : fails++; console.log(`${cond ? '✅' : '❌'} ${msg}`); };
const section = t => console.log(`— ${t}`);

// Servidor de prueba (sin claves: SumUp simulado, emails solo registrados)
const env = { ...process.env, PORT: String(PORT), BASE_URL: B, ADMIN_USER: 'admin', ADMIN_PASS: 'test-pass-123', SUMUP_MOCK: 'true', DB_PATH: path.join(TMP, 't.db'), NODE_ENV: 'test' };
for (const k of ['SUMUP_API_KEY', 'SUMUP_MERCHANT_CODE', 'RESEND_API_KEY', 'MAIL_FROM', 'R2_ACCOUNT_ID']) delete env[k];
const server = spawn(process.execPath, ['server.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
server.stdout.on('data', d => { log += d; });
server.stderr.on('data', d => { log += d; });

async function waitUp() {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(B + '/api/content')).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('El servidor no arrancó:\n' + log);
}

const jar = {};
async function call(url, { method, body, as, form, redirect = 'manual' } = {}) {
  method ??= body !== undefined || form ? 'POST' : 'GET';
  const headers = {};
  if (as && jar[as]) headers.cookie = jar[as];
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (form) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  const r = await fetch(B + url, { method, headers, redirect, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const ct = r.headers.get('content-type') || '';
  return { status: r.status, location: r.headers.get('location'), data: ct.includes('json') ? await r.json() : await r.text() };
}
async function login(name, username, password) {
  const r = await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  jar[name] = (r.headers.get('set-cookie') || '').split(';')[0];
  return r.status;
}
const day = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
// Próximo sábado (Tarifa 2) y próximo miércoles (Tarifa 1, si no es festivo)
const next = dow => { for (let i = 2; i < 12; i++) { const d = new Date(Date.now() + i * 864e5); if (d.getUTCDay() === dow) return d.toISOString().slice(0, 10); } };
const client = { name: 'Cliente Prueba', phone: '612345678', email: 'cliente@example.com', privacy: true };
const tokenOf = url => url.split('/pago/')[1].split('?')[0];
const bookingById = async id => (await call('/api/panel/bookings', { as: 'admin' })).data.bookings.find(b => b.id === id);

// Paga un enlace con el simulador: r = PAID | FAILED
async function payWith(token, r) {
  const co = await call(`/api/pay/${token}/checkout`, { body: { accept: true } });
  const id = co.data.url.split('/sumup-simulado/')[1];
  await call('/sumup-simulado/' + id, { form: 'r=' + r });
  return (await call('/api/pay/' + token)).data.state;
}

try {
  await waitUp();

  section('Web pública');
  ok((await call('/')).status === 200, 'portada responde');
  ok((await call('/guia')).status === 200, 'guía /guia responde');
  const site = (await call('/api/content')).data;
  ok(site.pricing?.destinations?.length > 0 && site.fleet?.length > 0, 'el contenido incluye tarifas y flota');

  section('Precios (los calcula el servidor)');
  const wed = next(3), sat = next(6);
  const q = async b => (await call('/api/quote', { body: b })).data;
  ok((await q({ mode: 'airport', pax: 3, date: wed, time: '10:00' })).amount === 35, 'aeropuerto 1-4 pax: 35 €');
  ok((await q({ mode: 'airport', pax: 6, date: wed, time: '10:00' })).amount === 50, 'aeropuerto 5-8 pax: 50 €');
  ok((await q({ mode: 'airport', pax: 3, extras: { baby: true, booster: true }, date: wed, time: '10:00' })).amount === 45, 'extras de pago: +5 € cada uno');
  const malT1 = await q({ mode: 'route', destinationId: 'malaga', pax: 2, date: wed, time: '10:00' });
  const malT2 = await q({ mode: 'route', destinationId: 'malaga', pax: 2, date: sat, time: '10:00' });
  ok(malT1.tariff === 'T1' && malT2.tariff === 'T2' && malT2.amount > malT1.amount, `Málaga: Tarifa 1 entre semana (${malT1.amount} €), Tarifa 2 en sábado (${malT2.amount} €)`);
  ok((await q({ mode: 'route', destinationId: 'malaga', pax: 2, date: wed, time: '23:00' })).tariff === 'T2', 'Tarifa 2 de noche');
  ok((await call('/api/quote', { body: { mode: 'route', destinationId: 'no-existe', pax: 2, date: wed, time: '10:00' } })).status === 400, 'destino desconocido: error');
  ok((await call('/api/quote', { body: { mode: 'airport', pax: 6, extras: { pmr: true }, date: wed, time: '10:00' } })).status === 400, 'movilidad reducida limita los pasajeros');

  section('Reserva con precio y pago al momento');
  const bk = await call('/api/bookings', { body: { ...client, mode: 'airport', direction: 'toCity', address: 'Hotel Alfonso XIII', pax: 2, amount: 1, date: wed, time: '11:00' } });
  ok(bk.status === 201 && bk.data.amount === 35 && bk.data.payUrl, 'crea la reserva con precio del servidor (ignora el importe del navegador) y enlace de pago');
  ok((await call('/api/bookings', { body: { ...client, privacy: false, mode: 'airport', pax: 2, date: wed, time: '11:00' } })).status === 400, 'sin aceptar la privacidad: rechazada');
  ok((await call('/api/bookings', { body: { ...client, mode: 'airport', pax: 2, date: day(-2), time: '11:00' } })).status === 400, 'fecha pasada: rechazada');
  const t1 = tokenOf(bk.data.payUrl);
  ok((await call('/api/pay/' + t1)).data.state === 'ready', 'la página de pago está lista');
  ok((await call(`/api/pay/${t1}/checkout`, { body: {} })).status === 400, 'sin aceptar las condiciones no se puede pagar');
  ok(await payWith(t1, 'PAID') === 'paid', 'pago correcto → pagada');

  section('Panel');
  ok(await login('admin', 'admin', 'test-pass-123') === 200, 'login de administrador');
  ok((await call('/api/panel/bookings')).status === 401, 'sin sesión: 401');
  const b1 = await bookingById(bk.data.id);
  ok(b1.payment_status === 'pagado' && b1.status === 'pagada' && b1.payments.some(p => p.status === 'PAID'), 'el panel la muestra pagada con su intento de pago');
  ok(b1.emails.some(e => e.kind === 'quote') && b1.emails.some(e => e.kind === 'paid'), 'se registran los emails de presupuesto y de pago');
  ok((await call('/api/panel/bookings/' + bk.data.id, { method: 'PATCH', as: 'admin', body: { amount: '99' } })).status === 400, 'una reserva pagada no admite cambio de precio');

  section('Pago rechazado y reintento');
  const bk2 = await call('/api/bookings', { body: { ...client, mode: 'route', direction: 'fromSevilla', destinationId: 'carmona', pax: 2, date: wed, time: '12:00' } });
  const t2 = tokenOf(bk2.data.payUrl);
  ok(await payWith(t2, 'FAILED') === 'failed', 'pago rechazado → fallido');
  ok((await bookingById(bk2.data.id)).status === 'pendiente', 'la reserva sigue pendiente');
  ok(await payWith(t2, 'PAID') === 'paid', 'el reintento se puede pagar');

  section('Otro trayecto (presupuesto manual)');
  const bk3 = await call('/api/bookings', { body: { ...client, mode: 'custom', origin: 'Hotel Colón', destination: 'Ronda', pax: 3, date: wed, time: '09:00' } });
  ok(bk3.status === 201 && !bk3.data.payUrl, 'sin precio automático ni enlace');
  await call('/api/panel/bookings/' + bk3.data.id, { method: 'PATCH', as: 'admin', body: { amount: '180,50' } });
  const qt = await call(`/api/panel/bookings/${bk3.data.id}/quote`, { as: 'admin', body: {} });
  ok(qt.status === 200 && qt.data.url && qt.data.wa.startsWith('https://wa.me/'), 'el admin pone precio y genera enlace + WhatsApp');
  ok((await call('/api/pay/' + tokenOf(qt.data.url))).data.amount === 180.5, 'el cliente ve 180,50 €');

  section('Reserva creada a mano (cliente de WhatsApp)');
  const man = await call('/api/panel/bookings', { as: 'admin', body: { name: 'Pedro', phone: '611222333', origin: 'Santa Justa', destination: 'Jerez', date: wed, time: '10:15', pax: 2, amount: '150', extras: { child: true } } });
  ok(man.status === 201 && man.data.url && man.data.wa.includes('wa.me/34611222333'), 'sin email y con precio: enlace de pago y WhatsApp');
  const manB = await bookingById(man.data.id);
  ok(manB.source === 'panel' && manB.email === '' && manB.emails.length === 0, 'marcada como creada en el panel y sin emails');
  ok((await call('/api/panel/bookings', { as: 'admin', body: { name: 'X' } })).status === 400, 'faltan datos: error');
  ok((await call('/api/panel/bookings', { as: 'admin', body: { name: 'X', phone: '1', origin: 'a', destination: 'b', date: day(-1), time: '10:00' } })).status === 400, 'fecha pasada: error');

  section('Casos especiales');
  ok((await call('/api/sumup/webhook', { body: { id: 'desconocido' } })).status === 200, 'webhook con id desconocido: se ignora');
  const bk4 = await call('/api/bookings', { body: { ...client, mode: 'airport', pax: 1, date: wed, time: '15:00' } });
  await call('/api/panel/bookings/' + bk4.data.id, { method: 'PATCH', as: 'admin', body: { status: 'cancelada' } });
  ok((await call('/api/pay/' + tokenOf(bk4.data.payUrl))).data.state === 'cancelled', 'reserva cancelada: la página lo dice');
  ok((await call(`/api/pay/${tokenOf(bk4.data.payUrl)}/checkout`, { body: { accept: true } })).status >= 400, 'reserva cancelada: no deja pagar');

  section('Empresas (hoteles): enlace privado, sin precios, paga el cliente');
  const co = await call('/api/panel/companies', { as: 'admin', body: { name: 'Hotel Prueba', email: 'hotel@example.com', daily_limit: 2 } });
  ok(co.status === 201 && /[/]empresa[/][A-Za-z0-9_-]{16,}$/.test(co.data.url), 'el admin crea una empresa y obtiene su enlace');
  const tok = co.data.url.split('/empresa/')[1];
  ok((await call('/empresa/' + tok)).status === 200, 'la página de la empresa abre sin registrarse');
  ok((await call('/api/empresa/' + tok)).data.name === 'Hotel Prueba', 'la página sabe de qué empresa es');
  ok((await call('/api/empresa/tokenfalso1234567890')).status === 404, 'un enlace inventado no sirve');
  const hotelBooking = n => call('/api/empresa/' + tok + '/bookings', { body: { mode: 'airport', direction: 'toCity', address: 'Hotel', pax: 2, date: wed, time: '12:0' + n, name: 'Huésped ' + n, phone: '61100011' + n, privacy: true } });
  const cb = await hotelBooking(1);
  ok(cb.status === 201 && cb.data.amount === undefined && !cb.data.payUrl, 'el hotel registra la reserva sin ver precio ni pagar (y sin email del huésped)');
  const cbB = await bookingById(cb.data.id);
  ok(cbB.payment_status === 'sin_pago' && cbB.amount_eur === 35 && cbB.company_name === 'Hotel Prueba', 'la reserva queda con el precio de tarifa para cobrar al cliente');
  ok(cbB.emails.some(e => e.kind === 'company'), 'se envía la confirmación al hotel');
  ok((await hotelBooking(2)).status === 201 && (await hotelBooking(3)).status === 429, 'tope diario por empresa (protección si el enlace se filtra)');
  await call('/api/panel/bookings/' + cb.data.id, { method: 'PATCH', as: 'admin', body: { settled: true } });
  ok((await bookingById(cb.data.id)).payment_status === 'pagado', 'Joaquín la marca como cobrada en mano');
  const mo = await call('/api/panel/companies/' + co.data.id + '/month?month=' + wed.slice(0, 7), { as: 'admin' });
  ok(mo.data.bookings.length === 2 && mo.data.unpaid === 35, 'resumen mensual de la empresa (viajes y lo que falta cobrar a los clientes)');
  await call('/api/panel/companies/' + co.data.id, { method: 'PATCH', as: 'admin', body: { active: false } });
  ok((await call('/api/empresa/' + tok)).status === 404, 'empresa desactivada: su enlace deja de funcionar');

  section('SEO');
  const rp = await call('/traslados/sevilla-malaga');
  ok(rp.status === 200 && rp.data.includes('<h1') && rp.data.includes('Málaga'), 'la página de una ruta llega ya con su contenido (SSR)');
  ok(rp.data.includes('rel="canonical"') && rp.data.includes('hreflang="en"') && rp.data.includes('application/ld+json'), 'canónica, idiomas y datos estructurados');
  ok((await call('/en/transfers/seville-airport')).data.includes('Seville Airport'), 'versión en inglés');
  ok((await call('/traslados/no-existe')).status === 404, 'ruta desconocida: 404');
  ok((await call('/?lang=en')).status === 301, '?lang=en redirige a /en');
  const sm = await call('/sitemap.xml');
  ok(sm.status === 200 && (sm.data.match(/<loc>/g) || []).length > 60, 'sitemap.xml con todas las páginas');
  ok((await call('/robots.txt')).data.includes('Disallow: /'), 'fuera del dominio definitivo no se deja indexar');
  const gp = await call('/taxi-7-plazas-sevilla');
  ok(gp.status === 200 && gp.data.includes('Taxi 7 y 8 plazas en Sevilla') && gp.data.includes('FAQPage'), 'página «Taxi 7 y 8 plazas» con su contenido y preguntas para Google');
  ok((await call('/en/7-seater-taxi-seville')).data.includes('7 and 8-seater taxi'), 'versión en inglés de la página de 7-8 plazas');
  ok((await call('/')).data.includes('<title>Taxi Sevilla 24 h'), 'la portada se presenta a Google como «Taxi Sevilla 24 h»');
  ok((await call('/traslados/sevilla-malaga')).data.includes('<title>Taxi Sevilla – Málaga'), 'las rutas empiezan por «Taxi»');
  ok(sm.data.includes('/taxi-7-plazas-sevilla'), 'la página de 7-8 plazas está en el sitemap');
  ok((await fetch(B + '/robots.txt').then(r => r.text())).length > 0, 'robots.txt responde');

  section('Permisos');
  ok((await call('/api/panel/users', { as: 'admin', body: { username: 'gestor1', name: 'Gestor', role: 'gestor', password: 'gestor-pass-1' } })).status < 300, 'el admin crea un gestor');
  await login('gestor', 'gestor1', 'gestor-pass-1');
  ok((await call('/api/panel/bookings', { as: 'gestor' })).status === 200, 'el gestor ve las reservas');
  ok((await call('/api/panel/pricing', { as: 'gestor' })).status === 403, 'el gestor no puede tocar tarifas');
  ok((await call('/api/panel/content', { as: 'gestor' })).status === 403, 'el gestor no puede editar la web');
  ok((await call('/api/panel/companies', { as: 'gestor' })).status === 403, 'el gestor no puede gestionar empresas');
} catch (e) {
  fails++;
  console.error('❌ Error inesperado:', e);
} finally {
  server.kill();
  await new Promise(r => setTimeout(r, 300));
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
  console.log(`\n${passes} correctas, ${fails} fallidas`);
  process.exit(fails ? 1 : 0);
}
