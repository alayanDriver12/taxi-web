// Contenido editable de la web: se guarda como JSON en la tabla settings y se
// combina con content/defaults.js. Todo lo que llega del panel se valida contra
// la forma de los valores por defecto (solo claves conocidas, solo texto).
const defaults = require('../content/defaults');

const IMAGE_SLOTS = Object.keys(defaults.images);
const MAX_TEXT = 2000;
const MAX_ITEMS = 40;

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

// Misma forma que el modelo pero vacía (para rellenar huecos en elementos nuevos)
function blank(tpl) {
  if (Array.isArray(tpl)) return [];
  if (isObj(tpl)) return Object.fromEntries(Object.keys(tpl).map(k => [k, blank(tpl[k])]));
  return typeof tpl === 'boolean' ? false : '';
}

// Combina lo guardado con los valores por defecto; ignora claves desconocidas
function merge(base, over) {
  if (Array.isArray(base)) {
    if (!Array.isArray(over)) return base;
    const tpl = base.length ? blank(base[0]) : '';
    return over.map(item => merge(tpl, item));
  }
  if (isObj(base)) return Object.fromEntries(Object.keys(base).map(k => [k, merge(base[k], isObj(over) ? over[k] : undefined)]));
  return over === undefined || typeof over !== typeof base ? base : over;
}

// Fuerza el valor recibido a la forma del modelo
function sanitize(value, tpl) {
  if (Array.isArray(tpl)) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, MAX_ITEMS).map(v => sanitize(v, tpl.length ? tpl[0] : ''));
  }
  if (isObj(tpl)) return Object.fromEntries(Object.keys(tpl).map(k => [k, sanitize(isObj(value) ? value[k] : undefined, tpl[k])]));
  if (typeof tpl === 'boolean') return value === true;
  return typeof value === 'string' ? value.slice(0, MAX_TEXT) : '';
}

// Textos por defecto que han cambiado. Si el contenido guardado conserva el valor ANTIGUO tal cual
// (nadie lo ha personalizado), se sustituye por el nuevo al arrancar. Lo personalizado no se toca.
const RENAMED = {
  ES: {
    'Silla infantil gratis': 'Silla infantil (5 €)',
    "TRASLADO PRIVADO CON CONDUCTOR": "TAXI Y TRASLADO PRIVADO",
    "Traslado {from} – {to}": "Taxi {from} – {to}",
    "Traslado {from} – {to} desde {price}: taxi y transfer privado": "Taxi {from} – {to} desde {price}: precio cerrado",
    "Transfer privado de {from} a {to}: {km} km, unos {duration}. Precio cerrado desde {price} con IVA y peajes. Reserva y paga online. Conductor profesional 24/7.": "Taxi de {from} a {to}: {km} km, unos {duration}. Precio cerrado desde {price} con IVA y peajes. Reserva y paga online. Servicio 24 h.",
    "Taxi y transfer Aeropuerto de Sevilla": "Taxi Aeropuerto de Sevilla",
    "Taxi Aeropuerto de Sevilla a precio fijo ({small}): transfer privado": "Taxi Aeropuerto de Sevilla: precio fijo {small} · 24 h",
    "Transfer del aeropuerto de Sevilla (SVQ) a la ciudad a precio fijo: {small} hasta {smallPax} pasajeros y {large} hasta {maxPax}. Seguimiento del vuelo, Meet & Greet y pago online.": "Taxi del aeropuerto de Sevilla (SVQ) a la ciudad a precio fijo: {small} hasta {smallPax} pasajeros y {large} hasta {maxPax}. Seguimiento del vuelo, espera incluida y pago online. 24 h.",
    "Traslados privados desde Sevilla": "Taxi desde Sevilla a toda Andalucía",
    "Traslados privados desde Sevilla a toda Andalucía: precios": "Taxi desde Sevilla a toda Andalucía: precios cerrados",
    "Traslados privados y taxi al aeropuerto en Sevilla y Andalucía": "Taxi en Sevilla 24 horas: aeropuerto, estación Santa Justa y toda Andalucía",
    'Agua + prensa': 'Agua de cortesía',
    'Agua y prensa': 'Agua de cortesía',
    '1-3 pasajeros': '1-4 pasajeros',
    'Portugal y Pueblos Blancos': 'Pueblos Blancos y Costa',
    'PORTUGAL': 'PUERTOS DE CRUCEROS',
    'Faro • Lisboa • Oporto • Puertos y aeropuertos': 'Cádiz • Málaga • Huelva • Algeciras',
    'Presupuesto inmediato. Pago protegido. Confirmación por WhatsApp.': 'Precio al momento. Pago protegido. Confirmación por WhatsApp.'
  },
  EN: {
    'Free child seat': 'Child seat (€5)',
    "PRIVATE TRANSFER WITH DRIVER": "PRIVATE TAXI & TRANSFER",
    "Transfer {from} – {to}": "Taxi {from} to {to}",
    "Transfer {from} to {to} from {price}: private taxi & transfer": "Taxi {from} to {to} from {price}: fixed price",
    "Private transfer from {from} to {to}: {km} km, about {duration}. Fixed price from {price} incl. VAT and tolls. Book and pay online. Professional driver 24/7.": "Taxi from {from} to {to}: {km} km, about {duration}. Fixed price from {price} incl. VAT and tolls. Book and pay online. 24/7 service.",
    "Seville Airport taxi & transfer": "Seville Airport taxi",
    "Seville Airport taxi at a fixed price ({small}): private transfer": "Seville Airport taxi: fixed price {small} · 24h",
    "Private transfers from Seville": "Taxi from Seville to all of Andalusia",
    "Private transfers from Seville to all of Andalusia: prices": "Taxi from Seville to all of Andalusia: fixed prices",
    "Alayan Driver · Private transfers in Seville and Andalusia": "Seville Taxi 24h · Airport at a fixed price | Alayan Driver",
    "Private transfers and airport taxi in Seville and all of Andalusia. Fixed prices, professional drivers, premium vehicles and online payment.": "Taxi in Seville 24 hours: Seville Airport at a fixed price, Santa Justa station and transfers to all of Andalusia. 7 and 8-seater taxis for groups. Book online or on WhatsApp.",
    "Private transfers and airport taxi in Seville and Andalusia": "Seville taxi 24 hours: airport, Santa Justa station and all of Andalusia",
    'Water + press': 'Complimentary water',
    'Water & press': 'Complimentary water',
    '1-3 passengers': '1-4 passengers',
    'Portugal & White Villages': 'White Villages & Coast',
    'PORTUGAL': 'CRUISE PORTS',
    'Faro • Lisbon • Porto • Ports & airports': 'Cadiz • Malaga • Huelva • Algeciras',
    'Instant quote. Protected payment. WhatsApp confirmation.': 'Instant price. Protected payment. WhatsApp confirmation.'
  }
};
// Email de presupuesto: antes llevaba una línea «Precio: …» que ahora va dentro del resumen
for (const [L, line] of [['ES', 'Precio: {amount} (IVA incluido).'], ['EN', 'Price: {amount} (VAT included).']]) {
  const NL = String.fromCharCode(10), body = defaults[L].notify.quote.body;
  RENAMED[L][body.replace('{summary}' + NL + NL, '{summary}' + NL + NL + line + NL + NL)] = body;
}
const OLD_WHATSAPP = ['34600000000', '34671407527']; // número de ejemplo y el anterior del cliente

function renameTexts(value, map) {
  if (Array.isArray(value)) return value.map(v => renameTexts(v, map));
  if (isObj(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, renameTexts(v, map)]));
  return typeof value === 'string' && Object.hasOwn(map, value) ? map[value] : value;
}

function createContentStore(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')), updated_by TEXT
  )`);
  const getRow = db.prepare(`SELECT value, updated_at, updated_by FROM settings WHERE key='content'`);
  const putRow = db.prepare(`INSERT INTO settings (key, value, updated_at, updated_by) VALUES ('content', ?, datetime('now'), ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at, updated_by=excluded.updated_by`);

  let cache = null;

  // Migración de textos antiguos (ver RENAMED)
  (function migrate() {
    const row = getRow.get();
    if (!row) return;
    let stored;
    try { stored = JSON.parse(row.value); } catch { return; }
    const next = { ...stored, ES: renameTexts(stored.ES, RENAMED.ES), EN: renameTexts(stored.EN, RENAMED.EN) };
    // SEO de portada: del texto por defecto antiguo al nuevo (con «taxi»)
    if (next.seo?.title === "Alayan Driver · Transfer en Andalucía") next.seo = { ...next.seo, title: "Taxi Sevilla 24 h · Aeropuerto a precio fijo | Alayan Driver" };
    if (next.seo?.description === "Transfers privados en Sevilla y toda Andalucía. Aeropuertos, estaciones, hoteles y eventos.") next.seo = { ...next.seo, description: "Taxi en Sevilla 24 horas: aeropuerto SVQ a precio fijo, estación Santa Justa y traslados a toda Andalucía. Taxi 7 y 8 plazas para grupos. Reserva online o por WhatsApp." };
    if (OLD_WHATSAPP.includes(next.contact?.whatsapp)) next.contact = { ...next.contact, whatsapp: defaults.contact.whatsapp };
    if (next.legal && !next.legal.phone) next.legal = { ...next.legal, phone: defaults.legal.phone };
    if (JSON.stringify(next) !== JSON.stringify(stored)) {
      putRow.run(JSON.stringify(next), 'actualización');
      console.log('Contenido: textos antiguos actualizados a los nuevos valores por defecto');
    }
  })();

  function get() {
    if (!cache) {
      let stored = {};
      try { stored = JSON.parse(getRow.get()?.value || '{}'); } catch { console.error('Contenido guardado ilegible, se usan los valores por defecto'); }
      cache = merge(defaults, stored);
    }
    return cache;
  }

  function write(next, username) {
    putRow.run(JSON.stringify(next), username);
    cache = null;
    return get();
  }

  function meta() {
    const row = getRow.get();
    return row ? { updatedAt: row.updated_at, updatedBy: row.updated_by } : null;
  }

  // Textos, contacto y SEO. Las imágenes van por su propia ruta.
  function saveTexts(input, username) {
    const whatsapp = String(input?.contact?.whatsapp ?? '').replace(/\D/g, '');
    if (!/^\d{8,15}$/.test(whatsapp)) throw new Error('El número de WhatsApp debe tener entre 8 y 15 dígitos, con prefijo de país (ej: 34612345678).');
    // Enlace de reseñas de Google: solo https (lo copia el admin de su Perfil de Empresa)
    const reviewUrl = String(input?.contact?.reviewUrl ?? '').trim().slice(0, 300);
    if (reviewUrl && !/^https:[/][/][^ ]+$/.test(reviewUrl)) throw new Error('El enlace de reseñas debe empezar por https://');
    return write({
      ...get(),
      contact: { whatsapp, reviewUrl },
      seo: sanitize(input.seo, defaults.seo),
      legal: sanitize(input.legal, defaults.legal),
      ES: sanitize(input.ES, defaults.ES),
      EN: sanitize(input.EN, defaults.EN)
    }, username);
  }

  function resetTexts(username) {
    const { images, legal } = get(); // imágenes y datos del titular no son «textos»: se conservan
    return write({ ...defaults, images, legal }, username);
  }

  function setImage(slot, url, username) {
    if (!IMAGE_SLOTS.includes(slot)) throw new Error('Imagen desconocida.');
    const cur = get();
    return write({ ...cur, images: { ...cur.images, [slot]: url ?? defaults.images[slot] } }, username);
  }

  return { get, meta, saveTexts, resetTexts, setImage, defaults };
}

module.exports = { createContentStore, IMAGE_SLOTS };
