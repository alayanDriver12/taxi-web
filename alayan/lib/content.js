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
    '1-3 pasajeros': '1-4 pasajeros',
    'Portugal y Pueblos Blancos': 'Pueblos Blancos y Costa',
    'PORTUGAL': 'PUERTOS DE CRUCEROS',
    'Faro • Lisboa • Oporto • Puertos y aeropuertos': 'Cádiz • Málaga • Huelva • Algeciras',
    'Presupuesto inmediato. Pago protegido. Confirmación por WhatsApp.': 'Precio al momento. Pago protegido. Confirmación por WhatsApp.'
  },
  EN: {
    'Free child seat': 'Child seat (€5)',
    '1-3 passengers': '1-4 passengers',
    'Portugal & White Villages': 'White Villages & Coast',
    'PORTUGAL': 'CRUISE PORTS',
    'Faro • Lisbon • Porto • Ports & airports': 'Cadiz • Malaga • Huelva • Algeciras',
    'Instant quote. Protected payment. WhatsApp confirmation.': 'Instant price. Protected payment. WhatsApp confirmation.'
  }
};
const OLD_WHATSAPP = '34600000000'; // número de ejemplo

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
    if (next.contact?.whatsapp === OLD_WHATSAPP) next.contact = { ...next.contact, whatsapp: defaults.contact.whatsapp };
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
    return write({
      ...get(),
      contact: { whatsapp },
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
