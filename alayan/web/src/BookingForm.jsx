// Formulario de reserva tipo calculadora: aeropuerto ↔ Sevilla (precio fijo), pueblos y ciudades
// (tabla de tarifas) u otro trayecto (presupuesto). Muestra el precio al momento; al enviar, el servidor
// lo recalcula y, si hay precio, lleva al cliente directamente a pagar con SumUp.
import { useEffect, useMemo, useState } from 'react';
import { sendBooking } from './booking.js';
import { fill, withLang } from './util.js';
import { quoteLocal, money } from './pricing.js';

const EXTRAS = ['booster', 'baby', 'child', 'pmr', 'other'];
const EMPTY = {
  mode: 'airport', direction: 'toCity', destinationId: '', placeQuery: '',
  address: '', addressDest: '', origin: '', destination: '', flight: '',
  date: '', time: '', pax: 2, luggage: 2,
  extras: {}, extrasOther: '',
  name: '', company: '', phone: '', email: '', sign: ''
};

const input = 'mt-1.5 w-full h-11 px-4 rounded-full bg-white border border-black/10 text-[14px] outline-none focus:border-[#C5A46A] focus:ring-2 focus:ring-[#C5A46A]/20';
const label = 'text-[11px] tracking-[0.18em] text-black/60';

export default function BookingForm({ t, p, lang, waBase, owner, preset }) {
  const b = t.booking;
  const [f, setF] = useState(EMPTY);
  const [accepted, setAccepted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentId, setSentId] = useState(null);
  const [error, setError] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const set = patch => setF(prev => ({ ...prev, ...patch }));

  // Botones «Reservar» de las tarifas: rellenan el formulario
  useEffect(() => {
    if (!preset) return;
    const dest = preset.destinationId && p.destinations.find(d => d.id === preset.destinationId);
    set({
      mode: preset.mode,
      direction: preset.mode === 'route' ? 'fromSevilla' : 'toCity',
      ...(preset.pax ? { pax: preset.pax } : {}),
      ...(dest ? { destinationId: dest.id, placeQuery: dest.name } : {})
    });
    setSentId(null);
    setError('');
  }, [preset]);

  const pmr = !!f.extras.pmr;
  const maxPax = pmr ? p.pmrMaxPax : p.maxPax;
  useEffect(() => { if (f.pax > maxPax) set({ pax: maxPax }); }, [maxPax]);

  const quote = quoteLocal(p, { mode: f.mode, destinationId: f.destinationId, pax: f.pax, pmr, extras: f.extras, date: f.date, time: f.time });
  const priced = quote && !quote.error;
  const dest = p.destinations.find(d => d.id === f.destinationId);

  const matches = useMemo(() => {
    const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const q = norm(f.placeQuery);
    return p.destinations.filter(d => !q || norm(d.name).includes(q)).slice(0, 8);
  }, [f.placeQuery, p]);

  // Origen y destino legibles, para el mensaje de WhatsApp
  const city = p.airport.city;
  const route = f.mode === 'airport'
    ? (f.direction === 'toAirport' ? [city, p.airport.name] : [p.airport.name, city])
    : f.mode === 'route'
      ? (f.direction === 'toSevilla' ? [dest?.name || '', city] : [city, dest?.name || ''])
      : [f.origin, f.destination];

  async function submit() {
    setError('');
    const needed = [f.name, f.phone, f.email, f.date, f.time, ...(f.mode === 'custom' ? [f.origin, f.destination] : [])];
    if (needed.some(v => !String(v).trim())) return setError(b.missing);
    if (f.mode === 'route' && !dest) return setError(b.noPlace);
    if (!accepted) return setError(b.mustAccept);
    setSending(true);
    try {
      const r = await sendBooking({
        mode: f.mode, direction: f.direction, destinationId: f.destinationId,
        address: f.address, addressDest: f.addressDest, origin: f.origin, destination: f.destination,
        date: f.date, time: f.time, pax: f.pax, luggage: f.luggage, flight: f.flight, sign: f.sign,
        extras: f.extras, extrasOther: f.extrasOther,
        name: f.name, company: f.company, phone: f.phone, email: f.email,
        privacy: true, lang
      });
      if (r.payUrl) {
        location.href = r.payUrl + (lang === 'EN' ? '?lang=en' : '');
        return;
      }
      setSentId(r.id);
    } catch (e) {
      setError(e.message || b.error);
    }
    setSending(false);
  }

  if (sentId) {
    return (
      <div className="py-10 text-center" role="status">
        <div className="mx-auto h-14 w-14 rounded-full bg-[#C5A46A] grid place-items-center text-[24px]">✓</div>
        <p className="mt-6 serif text-[30px] leading-tight max-w-[440px] mx-auto">{fill(b.sent, { id: sentId })}</p>
        <button type="button" onClick={() => { setSentId(null); setF(EMPTY); setAccepted(false); }} className="mt-8 text-[12px] underline text-black/60">
          ←
        </button>
      </div>
    );
  }

  const tab = active => `flex-1 text-[11px] tracking-[0.12em] py-3 px-2 rounded-full transition font-semibold ${active ? 'bg-[#0A0A0A] text-white' : 'text-black/50 hover:text-black'}`;
  const dirBtn = active => `text-[11px] tracking-[0.1em] px-4 py-2 rounded-full border transition ${active ? 'bg-[#C5A46A] border-[#C5A46A] text-black font-semibold' : 'border-black/10 text-black/60 hover:border-black/30'}`;

  return (
    <div>
      {/* Tipo de trayecto */}
      <div className="flex p-1 rounded-full bg-white border border-black/5">
        {['airport', 'route', 'custom'].map(m => (
          <button key={m} type="button" onClick={() => set({ mode: m, direction: m === 'route' ? 'fromSevilla' : 'toCity' })} className={tab(f.mode === m)}>
            {b.modes[m].toUpperCase()}
          </button>
        ))}
      </div>

      {f.mode !== 'custom' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {(f.mode === 'airport' ? ['toCity', 'toAirport'] : ['fromSevilla', 'toSevilla']).map(dir => (
            <button key={dir} type="button" onClick={() => set({ direction: dir })} className={dirBtn(f.direction === dir)}>{b.directions[dir]}</button>
          ))}
        </div>
      )}

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {f.mode === 'route' && (
          <div className="md:col-span-2 relative">
            <label className={label}>{b.fields.place}</label>
            <input
              className={input}
              value={f.placeQuery}
              placeholder={b.placeholders.place}
              onFocus={() => setListOpen(true)}
              onBlur={() => setTimeout(() => setListOpen(false), 150)}
              onChange={e => set({ placeQuery: e.target.value, destinationId: '' })}
              autoComplete="off"
            />
            {listOpen && matches.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-2 rounded-[18px] bg-white border border-black/10 shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden">
                {matches.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onMouseDown={() => { set({ destinationId: d.id, placeQuery: d.name }); setListOpen(false); }}
                    className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-[#F7F3ED]"
                  >
                    <span className="text-[14px]">{d.name} <span className="text-black/40 text-[12px]">· {d.km} km</span></span>
                    <span className="text-[12px] font-semibold">{money(d.t1, lang)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {f.mode === 'custom' ? (
          <>
            <div className="md:col-span-2">
              <label className={label}>{b.fields.origin}</label>
              <input className={input} value={f.origin} onChange={e => set({ origin: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className={label}>{b.fields.destination}</label>
              <input className={input} value={f.destination} onChange={e => set({ destination: e.target.value })} />
            </div>
          </>
        ) : (
          <div className={f.mode === 'route' ? '' : 'md:col-span-2'}>
            <label className={label}>{b.fields.address}</label>
            <input className={input} value={f.address} placeholder={b.placeholders.address} onChange={e => set({ address: e.target.value })} />
          </div>
        )}
        {f.mode === 'route' && (
          <div>
            <label className={label}>{b.fields.addressDest}</label>
            <input className={input} value={f.addressDest} onChange={e => set({ addressDest: e.target.value })} />
          </div>
        )}

        <div>
          <label className={label}>{b.fields.date}</label>
          <input type="date" className={input} value={f.date} onChange={e => set({ date: e.target.value })} />
        </div>
        <div>
          <label className={label}>{b.fields.time}</label>
          <input type="time" className={input} value={f.time} onChange={e => set({ time: e.target.value })} />
        </div>

        <div>
          <label className={label}>{b.fields.pax}</label>
          <div className="mt-1.5 flex items-center h-11 rounded-full border border-black/10 bg-white px-1.5">
            <button type="button" onClick={() => set({ pax: Math.max(1, f.pax - 1) })} className="w-8 h-8 rounded-full border border-black/10 grid place-items-center hover:bg-black hover:text-white transition">−</button>
            <span className="flex-1 text-center text-[15px] font-semibold">{f.pax} <span className="text-black/40 font-normal text-[12px]">PAX</span></span>
            <button type="button" onClick={() => set({ pax: Math.min(maxPax, f.pax + 1) })} className="w-8 h-8 rounded-full bg-[#0A0A0A] text-white grid place-items-center hover:bg-black transition">+</button>
          </div>
          {pmr && <div className="mt-1.5 text-[11px] text-[#9a7b45]">{fill(b.pmrNote, { max: p.pmrMaxPax })}</div>}
        </div>
        <div>
          <label className={label}>{b.fields.luggage}</label>
          <input type="number" min="0" max="20" className={input} value={f.luggage} onChange={e => set({ luggage: e.target.value })} />
        </div>

        {f.mode === 'airport' && (
          <div className="md:col-span-2">
            <label className={label}>{b.fields.flight}</label>
            <input className={input} value={f.flight} onChange={e => set({ flight: e.target.value })} />
          </div>
        )}
      </div>

      {/* Extras: sillas infantiles y alzador con precio (ajustable en /admin/tarifas); el resto sin coste */}
      <div className="mt-6">
        <div className="text-[10px] tracking-[0.3em] text-black/40 font-semibold mb-3">{b.extrasTitle}</div>
        <div className="flex flex-wrap gap-2">
          {EXTRAS.map(k => (
            <label key={k} className={`flex items-center gap-2 rounded-full border px-4 py-2.5 cursor-pointer text-[12px] transition ${f.extras[k] ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'bg-white text-black/70 border-black/10 hover:border-black/20'}`}>
              <input
                type="checkbox"
                checked={!!f.extras[k]}
                onChange={e => set({ extras: { ...f.extras, [k]: e.target.checked } })}
                className="accent-[#C5A46A] w-4 h-4"
              />
              {b.extras[k]}
              {p.extras?.[k] > 0 && <span className={f.extras[k] ? 'text-[#C5A46A]' : 'text-black/40'}>+{money(p.extras[k], lang)}</span>}
            </label>
          ))}
        </div>
        {f.extras.other && (
          <input className={input} value={f.extrasOther} placeholder={b.fields.other} onChange={e => set({ extrasOther: e.target.value })} />
        )}
      </div>

      {/* Datos del cliente */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {['name', 'company', 'phone', 'email'].map(k => (
          <div key={k}>
            <label className={label}>{b.fields[k]}</label>
            <input type={k === 'email' ? 'email' : k === 'phone' ? 'tel' : 'text'} className={input} value={f[k]} onChange={e => set({ [k]: e.target.value })} />
          </div>
        ))}
        <div className="md:col-span-2">
          <label className={label}>{b.fields.sign}</label>
          <input className={input} value={f.sign} placeholder={b.placeholders.sign} onChange={e => set({ sign: e.target.value })} />
        </div>
      </div>

      {/* Total */}
      <div className="mt-6 rounded-[20px] bg-[#0A0A0A] text-white px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] tracking-[0.25em] text-white/40">{b.total}</div>
          {priced ? (
            <div className="serif text-[40px] leading-none text-[#C5A46A] mt-1">{money(quote.amount, lang)}</div>
          ) : (
            <div className="serif text-[26px] leading-none text-[#C5A46A] mt-2">{f.mode === 'route' && !dest ? '—' : b.quoteLabel}</div>
          )}
        </div>
        <div className="text-right text-[11px] text-white/50 leading-relaxed max-w-[260px]">
          {priced ? (
            <>
              <div className="text-white/80">{quote.tariff === 'T2' ? b.tariff2 : b.tariff1}</div>
              {quote.extrasAmount > 0 && <div>{fill(b.extrasIncluded, { amount: money(quote.extrasAmount, lang) })}</div>}
              <div>{b.totalNote}</div>
            </>
          ) : (
            <div>{f.mode === 'route' && !dest ? b.noPlace : b.quoteNote}</div>
          )}
        </div>
      </div>

      {/* Aceptación de privacidad y condiciones + información básica (primera capa, art. 13 RGPD) */}
      <label className="mt-6 flex gap-3 items-start text-[12px] leading-relaxed text-black/70 cursor-pointer">
        <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#C5A46A]" />
        <span>
          {b.acceptPrefix}{' '}
          <a href={withLang('/privacidad', lang)} target="_blank" className="underline hover:text-black">{t.footer.legal.privacy.toLowerCase()}</a>{' '}
          {b.acceptJoin}{' '}
          <a href={withLang('/condiciones', lang)} target="_blank" className="underline hover:text-black">{t.footer.legal.terms.toLowerCase()}</a>.
        </span>
      </label>
      <p className="mt-3 text-[11px] leading-relaxed text-black/45">{fill(b.privacyInfo, { owner: owner || t.brand.name })}</p>
      {error && <p className="mt-4 rounded-[14px] bg-[#6b2222]/10 border border-[#6b2222]/30 px-4 py-3 text-[13px] text-[#6b2222]" role="alert">{error}</p>}

      <div className="mt-6 grid sm:grid-cols-[1.3fr_0.7fr] gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={sending}
          className="h-12 px-4 rounded-full bg-[#C5A46A] text-black text-[11px] md:text-[12px] tracking-[0.16em] font-semibold flex items-center justify-center text-center leading-tight hover:brightness-110 transition disabled:opacity-60"
        >
          {sending ? '…' : (priced ? fill(b.pay, { amount: money(quote.amount, lang) }) : b.request).toUpperCase()}
        </button>
        <a
          href={`${waBase}?text=${encodeURIComponent(fill(b.whatsappMessage, { ...f, origin: route[0], destination: route[1] }))}`}
          target="_blank"
          rel="noopener"
          className="h-12 px-4 rounded-full border border-black/15 flex items-center justify-center text-center leading-tight text-[11px] md:text-[12px] tracking-[0.14em] font-semibold hover:bg-black/5 transition"
        >
          {b.whatsapp.toUpperCase()}
        </a>
      </div>
      <div className="mt-4 text-center text-[11px] tracking-wide text-black/50">{b.secure}</div>
    </div>
  );
}
