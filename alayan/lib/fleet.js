// Flota: vehículos con sus textos (ES/EN) y varias fotos cada uno (carrusel en la web).
// Se edita en /admin/flota y se guarda en settings ('fleet'). Las fotos van a /data/uploads.
const crypto = require('node:crypto');

const MAX_CARS = 12;
const MAX_IMAGES = 15;
const IMG_RE = /^\/(img|uploads)\/[\w.-]+$/;

const DEFAULTS = [
  {
    id: 'ford',
    images: ['/img/ford.jpg'],
    ES: { name: 'FORD • ALAYAN', plate: 'Matrícula ALAYAN', desc: 'Berlina ejecutiva, híbrida enchufable, 4 pax + 4 maletas grandes. Ideal aeropuerto y AVE.', badge: '' },
    EN: { name: 'FORD • ALAYAN', plate: 'ALAYAN plate', desc: 'Executive sedan, plug-in hybrid, 4 pax + 4 large bags. Ideal for airport & AVE.', badge: '' }
  },
  {
    id: 'tesla',
    images: ['/img/tesla.jpg'],
    ES: { name: 'TESLA • ALAYAN', plate: '100% eléctrico • Alta gama', desc: 'Silencio absoluto, cero emisiones, tech premium. Para clientes que exigen lo mejor.', badge: 'HÍBRIDO ENCHUFABLE ALTA GAMA' },
    EN: { name: 'TESLA • ALAYAN', plate: '100% electric • Premium', desc: 'Absolute silence, zero emissions, premium tech. For clients who demand the best.', badge: 'PREMIUM PLUG-IN HYBRID' }
  }
];

const str = (v, max) => String(v ?? '').slice(0, max);
const texts = t => ({ name: str(t?.name, 80), plate: str(t?.plate, 80), desc: str(t?.desc, 400), badge: str(t?.badge, 80) });

function sanitize(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).slice(0, MAX_CARS).map(car => {
    let id = /^[a-z0-9-]{1,40}$/.test(car?.id) ? car.id : crypto.randomBytes(4).toString('hex');
    while (seen.has(id)) id = crypto.randomBytes(4).toString('hex');
    seen.add(id);
    return {
      id,
      images: (Array.isArray(car?.images) ? car.images : []).filter(u => IMG_RE.test(u)).slice(0, MAX_IMAGES),
      ES: texts(car?.ES), EN: texts(car?.EN)
    };
  });
}

function createFleet(db) {
  const getRow = db.prepare(`SELECT value FROM settings WHERE key='fleet'`);
  const putRow = db.prepare(`INSERT INTO settings (key, value, updated_at, updated_by) VALUES ('fleet', ?, datetime('now'), ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at, updated_by=excluded.updated_by`);
  let cache = null;

  function get() {
    if (!cache) {
      let stored = null;
      try { stored = JSON.parse(getRow.get()?.value || 'null'); } catch { console.error('Flota guardada ilegible: se usa la de por defecto'); }
      cache = sanitize(stored || DEFAULTS);
    }
    return cache;
  }

  function write(list, username) {
    putRow.run(JSON.stringify(sanitize(list)), username);
    cache = null;
    return get();
  }

  // Textos y orden de los coches. Las fotos de cada coche se conservan (se gestionan aparte).
  function saveCars(input, username) {
    const current = Object.fromEntries(get().map(c => [c.id, c]));
    const list = (Array.isArray(input) ? input : []).map(c => ({
      ...c,
      images: Array.isArray(c?.images) && current[c?.id]
        ? c.images.filter(u => current[c.id].images.includes(u)) // permite reordenar/quitar, no inyectar URLs
        : current[c?.id]?.images || []
    }));
    return write(list, username);
  }

  function addImage(carId, url, username) {
    const list = get().map(c => ({ ...c, images: [...c.images] }));
    const car = list.find(c => c.id === carId);
    if (!car) throw new Error('Vehículo no encontrado.');
    if (car.images.length >= MAX_IMAGES) throw new Error(`Máximo ${MAX_IMAGES} fotos por vehículo.`);
    car.images.push(url);
    return write(list, username);
  }

  return { get, saveCars, addImage, MAX_IMAGES };
}

module.exports = { createFleet };
