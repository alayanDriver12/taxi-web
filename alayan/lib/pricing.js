// Tarifas: precio fijo aeropuerto ↔ Sevilla, precio por km, Tarifa 2 (sábados, festivos y noche),
// tabla de destinos y cobertura. Se editan en /admin/tarifas y se guardan en settings ('pricing').
// El precio que se cobra lo calcula SIEMPRE el servidor con quote(); la web solo lo muestra.
const crypto = require('node:crypto');

const DEFAULTS = {
  airport: {
    name: 'Aeropuerto de Sevilla (SVQ)',
    city: 'Sevilla',
    small: 35,          // 1..smallMaxPax pasajeros
    large: 50,          // smallMaxPax+1..maxPax pasajeros
    smallMaxPax: 4,
    applyT2: false      // la Tarifa 2 no se aplica al precio fijo
  },
  maxPax: 8,
  pmrMaxPax: 5,         // con persona de movilidad reducida caben menos pasajeros
  perKm: 1.7,
  minimum: 35,
  shortTripKm: 50,      // por debajo de estos km se suma el suplemento
  shortTripSupplement: 10,
  extras: { booster: 5, baby: 5, child: 5 }, // € por unidad; se suman al precio (sin Tarifa 2)
  t2: {
    multiplier: 1.2,
    nightStart: '21:00',
    nightEnd: '07:00',
    saturday: true,
    sunday: true,
    holidays: [
      '2026-01-01', '2026-01-06', '2026-02-28', '2026-04-02', '2026-04-03', '2026-05-01', '2026-08-15',
      '2026-10-12', '2026-11-02', '2026-12-07', '2026-12-08', '2026-12-25'
    ]
  },
  destinations: [
    ['Camas', 5, 'Aljarafe', 'pueblo'], ['San Juan de Aznalfarache', 7, 'Aljarafe', 'pueblo'],
    ['Mairena del Aljarafe', 9, 'Aljarafe', 'pueblo'], ['Dos Hermanas', 15, 'Metropolitana', 'pueblo'],
    ['Alcalá de Guadaíra', 17, 'Metropolitana', 'pueblo'], ['La Puebla del Río', 18, 'Marisma', 'pueblo'],
    ['Sanlúcar la Mayor', 22, 'Aljarafe', 'pueblo'], ['Los Palacios y Villafranca', 27, 'Bajo Guadalquivir', 'pueblo'],
    ['Utrera', 32, 'Campiña', 'pueblo'], ['Aznalcázar', 32, 'Doñana', 'pueblo'], ['Carmona', 33, 'Campiña', 'pueblo'],
    ['Pilas', 36, 'Aljarafe', 'pueblo'], ['El Castillo de las Guardas', 54, 'Sierra Norte', 'pueblo'],
    ['Lora del Río', 57, 'Vega', 'pueblo'], ['Marchena', 62, 'Campiña', 'pueblo'], ['Lebrija', 65, 'Bajo Guadalquivir', 'pueblo'],
    ['Morón de la Frontera', 67, 'Campiña', 'pueblo'], ['Cazalla de la Sierra', 80, 'Sierra Norte', 'pueblo'],
    ['Constantina', 84, 'Sierra Norte', 'pueblo'], ['Écija', 86, 'Campiña', 'pueblo'], ['Osuna', 92, 'Sierra Sur', 'pueblo'],
    ['Alanís', 95, 'Sierra Norte', 'pueblo'],
    ['Huelva', 95, 'Huelva', 'ciudad'], ['Jerez de la Frontera', 95, 'Cádiz', 'ciudad'], ['Cádiz', 125, 'Cádiz', 'ciudad'],
    ['Córdoba', 142, 'Córdoba', 'ciudad'], ['Málaga', 205, 'Málaga', 'ciudad'], ['Jaén', 242, 'Jaén', 'ciudad'],
    ['Granada', 255, 'Granada', 'ciudad'], ['Almería', 410, 'Almería', 'ciudad']
  ].map(([name, km, zone, type]) => ({ id: slug(name), name, km, zone, type })),
  coverage: {
    airports: ['Sevilla (SVQ)', 'Málaga (AGP)', 'Jerez (XRY)', 'Granada (GRX)', 'Almería (LEI)'],
    ports: ['Cádiz', 'Málaga', 'Huelva', 'Algeciras', 'Almería', 'Motril']
  }
};

const PAID_EXTRAS = ['booster', 'baby', 'child'];

function slug(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    || crypto.randomBytes(4).toString('hex');
}

// ---------- Validación ----------
const num = (v, min, max, def) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 100) / 100 : def;
};
const int = (v, min, max, def) => Math.round(num(v, min, max, def));
const str = (v, max = 120) => String(v ?? '').trim().slice(0, max);
const time = (v, def) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v)) ? String(v) : def);
const list = (v, max = 60) => (Array.isArray(v) ? v : String(v ?? '').split('\n')).map(x => str(x)).filter(Boolean).slice(0, max);

function sanitize(input) {
  const d = DEFAULTS, i = input || {};
  const a = i.airport || {};
  const smallMaxPax = int(a.smallMaxPax, 1, 20, d.airport.smallMaxPax);
  const maxPax = int(i.maxPax, smallMaxPax, 20, d.maxPax);
  const t2 = i.t2 || {};
  const seen = new Set();
  const destinations = (Array.isArray(i.destinations) ? i.destinations : []).slice(0, 300).map(x => {
    const name = str(x?.name, 80);
    let id = str(x?.id, 80) || slug(name);
    while (seen.has(id)) id += '-2';
    seen.add(id);
    return { id, name, km: num(x?.km, 1, 2000, 0), zone: str(x?.zone, 60), type: x?.type === 'ciudad' ? 'ciudad' : 'pueblo' };
  }).filter(x => x.name && x.km > 0).sort((x, y) => x.km - y.km || x.name.localeCompare(y.name, 'es'));
  return {
    airport: {
      name: str(a.name) || d.airport.name,
      city: str(a.city) || d.airport.city,
      small: num(a.small, 1, 5000, d.airport.small),
      large: num(a.large, 1, 5000, d.airport.large),
      smallMaxPax,
      applyT2: a.applyT2 === true
    },
    maxPax,
    pmrMaxPax: int(i.pmrMaxPax, 1, maxPax, Math.min(d.pmrMaxPax, maxPax)),
    perKm: num(i.perKm, 0.1, 100, d.perKm),
    minimum: num(i.minimum, 0, 5000, d.minimum),
    shortTripKm: num(i.shortTripKm, 0, 2000, d.shortTripKm),
    shortTripSupplement: num(i.shortTripSupplement, 0, 1000, d.shortTripSupplement),
    extras: Object.fromEntries(PAID_EXTRAS.map(k => [k, num(i.extras?.[k], 0, 500, d.extras[k])])),
    t2: {
      multiplier: num(t2.multiplier, 1, 5, d.t2.multiplier),
      nightStart: time(t2.nightStart, d.t2.nightStart),
      nightEnd: time(t2.nightEnd, d.t2.nightEnd),
      saturday: t2.saturday !== false,
      sunday: t2.sunday !== false,
      holidays: [...new Set(list(t2.holidays, 100).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)))].sort()
    },
    destinations,
    coverage: { airports: list(i.coverage?.airports), ports: list(i.coverage?.ports) }
  };
}

// ---------- Cálculo ----------
const round = n => Math.round(n); // precios redondos, como en la tarifa publicada

function kmPrices(p, km) {
  const base = km * p.perKm;
  const supplement = km < p.shortTripKm ? p.shortTripSupplement : 0;
  const t1 = round(Math.max(p.minimum, base + supplement));
  return { t1, t2: round(t1 * p.t2.multiplier), supplement };
}

// ¿Se aplica Tarifa 2? Sábados/domingos (según ajustes), festivos y de noche
function isT2(p, date, hhmm) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false;
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  if ((day === 6 && p.t2.saturday) || (day === 0 && p.t2.sunday)) return true;
  if (p.t2.holidays.includes(date)) return true;
  if (/^\d{2}:\d{2}$/.test(hhmm || '')) {
    const { nightStart: s, nightEnd: e } = p.t2;
    return s > e ? (hhmm >= s || hhmm < e) : (hhmm >= s && hhmm < e);
  }
  return false;
}

function createPricing(db) {
  const getRow = db.prepare(`SELECT value, updated_at, updated_by FROM settings WHERE key='pricing'`);
  const putRow = db.prepare(`INSERT INTO settings (key, value, updated_at, updated_by) VALUES ('pricing', ?, datetime('now'), ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at, updated_by=excluded.updated_by`);
  let cache = null;

  function get() {
    if (!cache) {
      let stored = null;
      try { stored = JSON.parse(getRow.get()?.value || 'null'); } catch { console.error('Tarifas guardadas ilegibles: se usan las de por defecto'); }
      cache = stored ? sanitize(stored) : sanitize(DEFAULTS);
    }
    return cache;
  }

  function save(input, username) {
    const next = sanitize(input);
    if (!next.destinations.length && (input?.destinations || []).length) throw new Error('Revisa la tabla de destinos: cada fila necesita nombre y km.');
    putRow.run(JSON.stringify(next), username);
    cache = null;
    return get();
  }

  function reset(username) {
    putRow.run(JSON.stringify(DEFAULTS), username);
    cache = null;
    return get();
  }

  const meta = () => { const r = getRow.get(); return r ? { updatedAt: r.updated_at, updatedBy: r.updated_by } : null; };

  // Lo que necesita la web para mostrar precios (incluye T1/T2 ya calculados por destino)
  function publicView() {
    const p = get();
    return {
      airport: p.airport, maxPax: p.maxPax, pmrMaxPax: p.pmrMaxPax, perKm: p.perKm, minimum: p.minimum,
      shortTripKm: p.shortTripKm, shortTripSupplement: p.shortTripSupplement, extras: p.extras, t2: p.t2, coverage: p.coverage,
      destinations: p.destinations.map(d => ({ ...d, ...kmPrices(p, d.km) }))
    };
  }

  // Precio de una reserva. Devuelve null si no se puede calcular (trayecto libre → presupuesto).
  function quote({ mode, destinationId, pax, pmr, extras = {}, date, time: hhmm }) {
    const p = get();
    const maxPax = pmr ? p.pmrMaxPax : p.maxPax;
    if (!(pax >= 1 && pax <= maxPax)) throw new Error(`El número de pasajeros debe estar entre 1 y ${maxPax}.`);
    const t2 = isT2(p, date, hhmm);
    // Sillas infantiles y alzador: precio fijo por unidad, se suma al trayecto
    const extrasAmount = PAID_EXTRAS.reduce((sum, k) => sum + (extras[k] ? p.extras[k] : 0), 0);
    if (mode === 'airport') {
      const base = pax <= p.airport.smallMaxPax ? p.airport.small : p.airport.large;
      const applyT2 = t2 && p.airport.applyT2;
      return { amount: (applyT2 ? round(base * p.t2.multiplier) : base) + extrasAmount, extrasAmount, tariff: applyT2 ? 'T2' : 'T1', fixed: true };
    }
    if (mode === 'route') {
      const d = p.destinations.find(x => x.id === destinationId);
      if (!d) throw new Error('Destino no encontrado. Elige uno de la lista o usa «Otro trayecto».');
      const prices = kmPrices(p, d.km);
      return { amount: (t2 ? prices.t2 : prices.t1) + extrasAmount, extrasAmount, tariff: t2 ? 'T2' : 'T1', destination: d };
    }
    return null;
  }

  return { get, save, reset, meta, publicView, quote, defaults: DEFAULTS };
}

module.exports = { PAID_EXTRAS, createPricing, isT2, kmPrices, slug };
