// Secciones de tarifas: precio fijo aeropuerto, interurbano por km, tabla de destinos y cobertura.
// Los números salen de pricing (editable en /admin/tarifas); los textos, de content (editable en /admin).
import { useMemo, useState } from 'react';
import { fill } from './util.js';
import { money } from './pricing.js';

export function FixedRates({ t, p, lang, onBook }) {
  const r = t.rates;
  const a = p.airport;
  const cards = [
    { price: a.small, pax: `1-${a.smallMaxPax} PAX`, title: r.smallTitle, points: r.smallPoints, dark: false, preset: { mode: 'airport', pax: 2 } },
    { price: a.large, pax: `${a.smallMaxPax + 1}-${p.maxPax} PAX`, title: r.largeTitle, points: r.largePoints, dark: true, preset: { mode: 'airport', pax: a.smallMaxPax + 1 } }
  ];
  return (
    <section id="tarifas" className="bg-[#F7F3ED] text-black border-t border-black/5">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-20 md:py-28">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div>
            <div className="text-[11px] tracking-[0.3em] text-[#C5A46A] font-semibold">{r.fixedKicker}</div>
            <h2 className="serif text-[42px] md:text-[56px] leading-[0.95] mt-3">
              {r.fixedTitle}
              <br />
              <span className="italic text-[#C5A46A]">{r.fixedAccent}</span>
            </h2>
          </div>
          <p className="text-[13px] leading-relaxed text-black/60 max-w-[380px]">{r.fixedSubtitle}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {cards.map(c => (
            <div
              key={c.pax}
              className={`relative overflow-hidden rounded-[28px] p-8 md:p-10 flex flex-col ${c.dark
                ? 'bg-[#0A0A0A] text-white border border-[#C5A46A]/20 shadow-[0_20px_60px_rgba(0,0,0,0.25)]'
                : 'bg-white border border-black/5 shadow-[0_20px_60px_rgba(0,0,0,0.06)]'}`}
            >
              {c.dark && <div className="pointer-events-none absolute -top-20 -right-20 w-[260px] h-[260px] bg-[#C5A46A]/20 rounded-full blur-3xl" />}
              <div className="relative flex items-baseline gap-3 flex-wrap">
                <span className="serif text-[56px] leading-none font-semibold">{money(c.price, lang)}</span>
                <span className={`text-[11px] tracking-[0.25em] font-semibold px-3 py-1 rounded-full border ${c.dark ? 'text-[#C5A46A] border-[#C5A46A]/30' : 'text-black/40 border-black/10'}`}>{c.pax}</span>
              </div>
              <div className={`relative serif text-[22px] mt-4 ${c.dark ? 'text-white/90' : ''}`}>{c.title}</div>
              <div className="relative mt-8 flex flex-wrap gap-2">
                {c.points.map((pt, i) => (
                  <span key={i} className={`text-[11px] px-3 py-1.5 rounded-full border ${c.dark ? 'bg-white/[0.06] border-white/10 text-white/70' : 'bg-[#F7F3ED] border-black/5 text-black/70'}`}>• {pt}</span>
                ))}
              </div>
              <div className="relative mt-10 flex items-center justify-between gap-4 flex-wrap">
                <span className={`flex items-center gap-3 text-[11px] tracking-[0.2em] ${c.dark ? 'text-[#C5A46A]/80' : 'text-black/50'}`}>
                  <span className="w-8 h-px bg-[#C5A46A]/50" />
                  {r.direct}
                </span>
                <button
                  type="button"
                  onClick={() => onBook(c.preset)}
                  className={`h-11 px-6 rounded-full text-[11px] tracking-[0.2em] font-semibold transition ${c.dark ? 'bg-[#C5A46A] text-black hover:brightness-110' : 'bg-[#0A0A0A] text-white hover:bg-black'}`}
                >
                  {r.book} →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function KmRates({ t, p, lang, waBase }) {
  const r = t.rates;
  const examples = r.kmExamples.map(n => p.destinations.find(d => d.name.toLowerCase() === String(n).toLowerCase())).filter(Boolean);
  const note = fill(r.kmNote, {
    minimum: money(p.minimum, lang), supplement: money(p.shortTripSupplement, lang), km: p.shortTripKm,
    pct: Math.round((p.t2.multiplier - 1) * 100), start: p.t2.nightStart, end: p.t2.nightEnd
  });
  return (
    <section className="bg-[#0A0A0A] text-white relative overflow-hidden border-t border-white/5">
      <div className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,#C5A46A33,transparent_60%)]" />
      <div className="relative mx-auto max-w-[1440px] px-6 md:px-10 py-20 md:py-28 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-start">
        <div>
          <div className="text-[11px] tracking-[0.3em] text-[#C5A46A]">{r.kmKicker}</div>
          <h2 className="serif text-[52px] md:text-[68px] leading-[0.9] mt-4">
            <span className="text-[#C5A46A]">{money(p.perKm, lang)} / km</span>
            <br />
            <span className="text-[32px] md:text-[36px] italic text-white/80">{r.kmSubtitle}</span>
          </h2>
          {examples.length > 0 && (
            <div className="mt-10 grid grid-cols-2 gap-4 max-w-[440px]">
              {examples.map(d => (
                <div key={d.id} className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
                  <div className="text-[10px] tracking-widest text-white/40">{d.km} KM</div>
                  <div className="serif text-[28px] mt-1 text-[#C5A46A]">{money(d.t1, lang)}</div>
                  <div className="text-[11px] text-white/50 mt-1">Sevilla — {d.name}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-8 rounded-2xl bg-[#C5A46A]/10 border border-[#C5A46A]/20 px-5 py-4 flex gap-3 max-w-[560px]">
            <div className="w-6 h-6 rounded-full bg-[#C5A46A] text-black grid place-items-center text-[12px] font-bold flex-shrink-0">!</div>
            <p className="text-[12px] leading-relaxed text-[#C5A46A]/90">{note}</p>
          </div>
        </div>
        <div className="rounded-[28px] bg-white text-black p-8 md:p-10 shadow-[0_20px_80px_rgba(0,0,0,0.4)] lg:mt-8">
          <div className="w-10 h-10 rounded-full bg-[#0A0A0A] grid place-items-center text-[#C5A46A] serif text-lg">↗</div>
          <h3 className="serif text-[26px] leading-tight mt-6">
            {r.kmCardTitle}
            <br />
            <span className="italic text-[#C5A46A]">{r.kmCardAccent}</span>
          </h3>
          <p className="text-[13px] leading-relaxed text-black/60 mt-4">{r.kmCardText}</p>
          <a href="#precios" className="mt-8 inline-flex h-11 px-6 items-center rounded-full bg-[#0A0A0A] text-white text-[11px] tracking-[0.2em] font-semibold hover:bg-black">
            {r.tableTitle.toUpperCase()} →
          </a>
          <a href={waBase} target="_blank" rel="noopener" className="mt-3 ml-0 sm:ml-3 inline-flex h-11 px-6 items-center rounded-full border border-black/15 text-[11px] tracking-[0.2em] font-semibold hover:bg-black/5">
            WHATSAPP
          </a>
        </div>
      </div>
    </section>
  );
}

export function PriceTable({ t, p, lang, onBook }) {
  const r = t.rates;
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [zone, setZone] = useState('');
  const [tariff, setTariff] = useState('T1');
  const zones = useMemo(() => [...new Set(p.destinations.map(d => d.zone).filter(Boolean))], [p]);
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const rows = p.destinations.filter(d =>
    (type === 'all' || d.type === type) && (!zone || d.zone === zone) && (!q || norm(d.name).includes(norm(q))));

  const pill = (active, dark) => `text-[11px] px-4 py-1.5 rounded-full border font-semibold transition ${active
    ? (dark ? 'bg-[#0A0A0A] text-white border-black' : 'bg-[#C5A46A] text-black border-[#C5A46A]')
    : 'bg-white text-black/60 border-black/10 hover:border-black/30'}`;

  return (
    <section id="precios" className="bg-[#F7F3ED] text-black border-t border-black/5">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-20 md:py-28">
        <div className="flex flex-col lg:flex-row justify-between gap-8 mb-10">
          <div className="max-w-[720px]">
            <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] bg-[#0A0A0A] text-[#C5A46A] px-4 py-2 rounded-full font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#C5A46A] animate-pulse" />
              {r.tableKicker}
            </div>
            <h2 className="serif text-[40px] md:text-[56px] leading-[0.95] mt-5">{r.tableTitle}</h2>
            <p className="text-[13px] leading-relaxed text-black/60 mt-4 max-w-[560px]">{r.tableSubtitle}</p>
          </div>
          <div className="rounded-[20px] bg-[#0A0A0A] text-white p-5 border border-[#C5A46A]/20 lg:w-[380px] text-[12px] leading-relaxed space-y-2 self-start">
            <div><b className="text-[#C5A46A]">{r.t1}:</b> {r.t1Note}.</div>
            <div><b className="text-[#C5A46A]">{r.t2}:</b> {r.t2Note} ({p.t2.nightStart}–{p.t2.nightEnd}).</div>
          </div>
        </div>

        <div className="rounded-[28px] bg-white border border-black/5 shadow-[0_20px_80px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="p-6 md:p-8 border-b border-black/5 bg-[#F7F3ED]/50 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={r.search}
                className="flex-1 h-12 rounded-full border border-black/10 bg-white px-5 text-[14px] outline-none focus:border-[#C5A46A] focus:ring-4 focus:ring-[#C5A46A]/10"
              />
              <div className="flex p-1 rounded-full bg-black self-start">
                {['T1', 'T2'].map(x => (
                  <button
                    key={x}
                    type="button"
                    onClick={() => setTariff(x)}
                    className={`text-[11px] tracking-widest px-5 py-2.5 rounded-full font-semibold transition ${tariff === x ? (x === 'T1' ? 'bg-[#C5A46A] text-black' : 'bg-white text-black') : 'text-white/60 hover:text-white'}`}
                  >
                    {r[x.toLowerCase()].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[['all', r.all], ['pueblo', r.towns], ['ciudad', r.cities]].map(([k, label]) => (
                <button key={k} type="button" onClick={() => setType(k)} className={pill(type === k, true)}>{label}</button>
              ))}
            </div>
            {zones.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setZone('')} className={pill(!zone)}>{r.all}</button>
                {zones.map(z => <button key={z} type="button" onClick={() => setZone(z)} className={pill(zone === z)}>{z}</button>)}
              </div>
            )}
          </div>

          <div className="max-h-[560px] overflow-auto divide-y divide-black/5">
            {rows.map(d => (
              <div key={d.id} className="grid grid-cols-[1fr_auto] md:grid-cols-[1.6fr_0.5fr_0.6fr_0.6fr_auto] gap-3 items-center px-6 md:px-8 py-4 hover:bg-[#F7F3ED] transition">
                <div className="min-w-0">
                  <div className="serif text-[18px] truncate">{d.name}</div>
                  <div className="text-[11px] text-black/40 mt-0.5">{d.zone}{d.zone ? ' · ' : ''}{d.km} km</div>
                </div>
                <div className="hidden md:block text-center text-[12px] text-black/60">{d.km} km</div>
                <div className={`hidden md:block text-center text-[13px] ${tariff === 'T1' ? 'font-semibold' : 'text-black/40'}`}>{money(d.t1, lang)}</div>
                <div className={`hidden md:block text-center text-[13px] ${tariff === 'T2' ? 'font-semibold' : 'text-black/40'}`}>{money(d.t2, lang)}</div>
                <div className="flex items-center gap-4 justify-end">
                  <span className="md:hidden serif text-[22px]">{money(tariff === 'T1' ? d.t1 : d.t2, lang)}</span>
                  <button
                    type="button"
                    onClick={() => onBook({ mode: 'route', destinationId: d.id })}
                    className="h-10 px-5 rounded-full bg-[#0A0A0A] text-white text-[10px] tracking-[0.2em] font-semibold hover:bg-[#C5A46A] hover:text-black transition"
                  >
                    {r.choose.toUpperCase()}
                  </button>
                </div>
              </div>
            ))}
            {!rows.length && <div className="px-8 py-16 text-center text-[13px] text-black/50">{r.empty}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Coverage({ t, p, waBase }) {
  const r = t.rates;
  if (!p.coverage.airports.length && !p.coverage.ports.length) return null;
  return (
    <section className="bg-[#C5A46A] text-black relative overflow-hidden">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-20 md:py-24 grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-start">
        <div>
          <h2 className="serif text-[40px] md:text-[54px] leading-[0.95]">
            {r.coverageTitle}
            <br />
            <span className="italic text-white">{r.coverageAccent}</span>
          </h2>
          <p className="text-[14px] leading-relaxed text-black/70 mt-6 max-w-[520px]">{r.coverageSubtitle}</p>
          {p.coverage.airports.length > 0 && (
            <>
              <div className="text-[11px] tracking-[0.3em] text-black/60 font-semibold mt-10 mb-4">{r.airports}</div>
              <div className="flex flex-wrap gap-2">
                {p.coverage.airports.map(x => <span key={x} className="text-[12px] px-4 py-2 rounded-full bg-black text-white">✈ {x}</span>)}
              </div>
            </>
          )}
          {p.coverage.ports.length > 0 && (
            <>
              <div className="text-[11px] tracking-[0.3em] text-black/60 font-semibold mt-8 mb-4">{r.ports}</div>
              <div className="flex flex-wrap gap-2">
                {p.coverage.ports.map(x => <span key={x} className="text-[12px] px-4 py-2 rounded-full bg-white text-black border border-black/10">⚓ {x}</span>)}
              </div>
            </>
          )}
        </div>
        <div className="rounded-[24px] bg-[#0A0A0A] text-white p-8">
          <p className="serif text-[24px] leading-tight">{t.brand.name}</p>
          <p className="text-[13px] text-white/60 mt-3">{t.brand.tagline}</p>
          <a
            href={`${waBase}?text=${encodeURIComponent(r.coverageMessage)}`}
            target="_blank"
            rel="noopener"
            className="mt-8 flex w-full h-12 items-center justify-center rounded-full bg-[#C5A46A] text-black text-[12px] tracking-[0.2em] font-semibold hover:brightness-110 transition"
          >
            {r.coverageCta.toUpperCase()}
          </a>
        </div>
      </div>
    </section>
  );
}
