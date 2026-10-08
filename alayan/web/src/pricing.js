// Cálculo de precios en el navegador, SOLO para mostrarlo al momento.
// El precio que se cobra lo recalcula el servidor (lib/pricing.js) al crear la reserva.

export function isT2(t2, date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false;
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  if ((day === 6 && t2.saturday) || (day === 0 && t2.sunday)) return true;
  if (t2.holidays.includes(date)) return true;
  if (/^\d{2}:\d{2}$/.test(time || '')) {
    const s = t2.nightStart, e = t2.nightEnd;
    return s > e ? (time >= s || time < e) : (time >= s && time < e);
  }
  return false;
}

// { amount, tariff } · null si es a presupuesto · { error } si los datos no valen
export function quoteLocal(p, { mode, destinationId, pax, pmr, extras = {}, date, time }) {
  const maxPax = pmr ? p.pmrMaxPax : p.maxPax;
  if (!(pax >= 1 && pax <= maxPax)) return { error: 'pax' };
  const t2 = isT2(p.t2, date, time);
  const extrasAmount = Object.keys(p.extras || {}).reduce((sum, k) => sum + (extras[k] ? p.extras[k] : 0), 0);
  if (mode === 'airport') {
    const base = pax <= p.airport.smallMaxPax ? p.airport.small : p.airport.large;
    const apply = t2 && p.airport.applyT2;
    return { amount: (apply ? Math.round(base * p.t2.multiplier) : base) + extrasAmount, extrasAmount, tariff: apply ? 'T2' : 'T1' };
  }
  if (mode === 'route') {
    const d = p.destinations.find(x => x.id === destinationId);
    if (!d) return { error: 'place' };
    return { amount: (t2 ? d.t2 : d.t1) + extrasAmount, extrasAmount, tariff: t2 ? 'T2' : 'T1' };
  }
  return null;
}

export const money = (n, lang) => new Intl.NumberFormat(lang === 'EN' ? 'en-GB' : 'es-ES', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2
}).format(n);
