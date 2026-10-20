// Páginas de traslados para Google: una por destino de la tabla (y el aeropuerto) y un índice.
// Precio, datos del trayecto, formulario de reserva ya rellenado, preguntas frecuentes y enlaces a otras rutas.
import { useState } from 'react';
import BookingForm from './BookingForm.jsx';
import { fill } from './util.js';
import { money } from './pricing.js';
import { HOME, ROUTES_INDEX, routeList, routePath, routeVars } from './routes.js';

function Breadcrumb({ items }) {
  return (
    <nav aria-label="breadcrumb" className="text-[11px] tracking-[0.15em] text-white/45">
      {items.map(([label, href], i) => (
        <span key={i}>
          {i > 0 && <span className="mx-2 text-white/25">/</span>}
          {href ? <a href={href} className="hover:text-white transition">{label}</a> : <span className="text-white/70">{label}</span>}
        </span>
      ))}
    </nav>
  );
}

function Faq({ title, items }) {
  const [open, setOpen] = useState(0);
  return (
    <section className="bg-[#F7F3ED] text-black">
      <div className="mx-auto max-w-[960px] px-6 md:px-10 py-16 md:py-20">
        <h2 className="serif text-[34px] md:text-[44px] leading-none">{title}</h2>
        <div className="mt-8 divide-y divide-black/10 border-y border-black/10">
          {items.map((f, i) => (
            <div key={i}>
              <h3>
                <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className="w-full flex justify-between items-center gap-4 py-5 text-left text-[16px] md:text-[17px] font-medium">
                  {f.q}
                  <span className={`shrink-0 h-7 w-7 rounded-full border border-black/15 grid place-items-center text-[14px] transition ${open === i ? 'rotate-45 bg-black text-white' : ''}`}>+</span>
                </button>
              </h3>
              {/* La respuesta está siempre en el HTML (Google la lee); solo se oculta visualmente */}
              <div className={`${open === i ? 'block' : 'hidden'} pb-5 text-[15px] leading-relaxed text-black/65 max-w-[760px]`}>{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RouteLinks({ title, routes, p, t, lang, current }) {
  const r = t.routes;
  return (
    <section className="bg-[#0A0A0A] border-t border-white/5">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-16">
        <h2 className="serif text-[30px] md:text-[38px]">{title}</h2>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {routes.filter(x => x.key !== current).map(x => {
            const v = routeVars(x, t, p, lang);
            return (
              <a key={x.key} href={routePath(x, lang)} className="group rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 flex items-center justify-between gap-3 hover:border-[#C5A46A]/50 transition">
                <span className="min-w-0">
                  <span className="block text-[14px] text-white/85 truncate">{v.from} → {v.to}</span>
                  {x.dest && <span className="block text-[11px] text-white/40 mt-0.5">{x.dest.km} km · {v.duration}</span>}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[10px] tracking-[0.15em] text-white/40">{r.fromPrice.toUpperCase()}</span>
                  <span className="serif text-[20px] text-[#C5A46A]">{v.price}</span>
                </span>
              </a>
            );
          })}
        </div>
        <a href={ROUTES_INDEX[lang]} className="mt-8 inline-flex h-11 px-6 items-center rounded-full border border-white/20 text-[11px] tracking-[0.2em] hover:bg-white hover:text-black transition">{r.viewAll.toUpperCase()} →</a>
      </div>
    </section>
  );
}

export function RoutePage({ route, content, t, lang, waBase }) {
  const r = t.routes, p = content.pricing;
  const v = routeVars(route, t, p, lang);
  const airport = route.kind === 'airport';
  const title = fill(airport ? r.airportTitle : r.title, v);
  const faq = (airport ? r.airportFaq : r.faq).map(f => ({ q: fill(f.q, v), a: fill(f.a, v) }));
  const preset = airport ? { mode: 'airport' } : { mode: 'route', destinationId: route.key };
  // Rutas relacionadas: aeropuerto + las de la misma zona + las más buscadas (ciudades)
  const all = routeList(p);
  const related = [
    ...(airport ? [] : all.filter(x => x.kind === 'airport')),
    ...all.filter(x => x.dest && route.dest && x.dest.zone === route.dest.zone),
    ...all.filter(x => x.dest?.type === 'ciudad')
  ].filter((x, i, arr) => arr.findIndex(y => y.key === x.key) === i && x.key !== route.key).slice(0, 8);

  const facts = airport
    ? [[fill(r.smallLabel, v), v.small], [fill(r.largeLabel, v), v.large], [r.facts.pax, fill(r.paxValue, v)]]
    : [[r.facts.distance, `${route.dest.km} km`], [r.facts.duration, v.duration], [r.facts.pax, fill(r.paxValue, v)], [r.facts.price, v.t1]];

  return (
    <>
      <section className="relative bg-[#0A0A0A] overflow-hidden">
        <div className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-[#C5A46A]/10 blur-3xl" />
        <div className="relative mx-auto max-w-[1440px] px-6 md:px-10 pt-10 pb-14 md:pt-14 md:pb-20">
          <Breadcrumb items={[[r.home, HOME[lang]], [r.nav, ROUTES_INDEX[lang]], [title]]} />
          <div className="mt-8 grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-end">
            <div>
              <div className="text-[11px] tracking-[0.35em] text-[#C5A46A]">{r.kicker}</div>
              <h1 className="serif mt-4 text-[44px] md:text-[68px] leading-[0.95]">{title}</h1>
              <p className="mt-5 text-[16px] md:text-[18px] text-white/65 max-w-[620px]">{airport ? r.airportSubtitle : r.subtitle}</p>
              <p className="mt-6 text-[15px] leading-relaxed text-white/55 max-w-[680px]">{fill(airport ? r.airportIntro : r.intro, v)}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#reserva" className="h-12 px-8 inline-flex items-center rounded-full bg-[#C5A46A] text-black text-[12px] tracking-[0.2em] font-semibold hover:brightness-110 transition">{t.nav.book.toUpperCase()} · {v.price}</a>
                <a href={waBase} target="_blank" rel="noopener" className="h-12 px-6 inline-flex items-center rounded-full border border-white/20 text-[12px] tracking-[0.18em] hover:bg-white hover:text-black transition">WHATSAPP</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {facts.map(([k, val]) => (
                <div key={k} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-[10px] tracking-[0.2em] text-white/45 uppercase">{k}</div>
                  <div className="serif mt-2 text-[28px] leading-none">{val}</div>
                </div>
              ))}
              {!airport && (
                <div className="col-span-2 rounded-2xl border border-[#C5A46A]/30 bg-[#C5A46A]/10 px-5 py-4 flex justify-between gap-4 text-[13px]">
                  <span><b className="text-[#C5A46A]">{t.rates.t1}</b> <span className="text-white/60">{t.rates.t1Note}</span><br /><span className="serif text-[22px]">{v.t1}</span></span>
                  <span className="text-right"><b className="text-[#C5A46A]">{t.rates.t2}</b> <span className="text-white/60">{t.rates.t2Note}</span><br /><span className="serif text-[22px]">{v.t2}</span></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="reserva" className="bg-[#0A0A0A] border-t border-white/10 scroll-mt-20">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-16 md:py-20 grid lg:grid-cols-[0.8fr_1.2fr] gap-10">
          <div>
            <h2 className="serif text-[36px] md:text-[46px] leading-[0.95]">{r.bookTitle}</h2>
            <div className="mt-8 rounded-[20px] bg-white/[0.04] border border-white/10 p-6">
              <div className="text-[12px] tracking-[0.2em] text-white/60">{r.includesTitle.toUpperCase()}</div>
              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] text-white/70">
                {t.booking.includes.map((item, i) => <li key={i}>✓ {item}</li>)}
              </ul>
              <div className="mt-6 text-[11px] leading-relaxed text-white/40">{t.booking.cancel}</div>
            </div>
          </div>
          <div className="rounded-[28px] bg-[#F7F3ED] text-black p-6 md:p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
            <BookingForm t={t} p={p} lang={lang} waBase={waBase} owner={content.legal.owner} preset={preset} />
          </div>
        </div>
      </section>

      <Faq title={r.faqTitle} items={faq} />
      <RouteLinks title={fill(r.otherTitle, v)} routes={related} p={p} t={t} lang={lang} current={route.key} />
    </>
  );
}

export function RoutesIndex({ content, t, lang, notFound }) {
  const r = t.routes, p = content.pricing;
  const all = routeList(p);
  const airport = all.find(x => x.kind === 'airport');
  const av = routeVars(airport, t, p, lang);
  // Agrupadas por zona, en el orden de la tabla (por km)
  const zones = [...new Set(p.destinations.map(d => d.zone || '—'))];
  return (
    <>
      <section className="bg-[#0A0A0A]">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10 pt-10 pb-12 md:pt-14">
          <Breadcrumb items={[[r.home, HOME[lang]], [r.nav]]} />
          <div className="mt-8 text-[11px] tracking-[0.35em] text-[#C5A46A]">{r.indexKicker}</div>
          <h1 className="serif mt-4 text-[44px] md:text-[68px] leading-[0.95] max-w-[900px]">{r.indexTitle}</h1>
          <p className="mt-5 text-[16px] md:text-[18px] text-white/60 max-w-[680px]">{notFound ? r.notFound : r.indexSubtitle}</p>
          <a href={routePath(airport, lang)} className="mt-10 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[24px] bg-[#C5A46A] text-black p-6 md:p-8 hover:brightness-105 transition">
            <span>
              <span className="block text-[11px] tracking-[0.3em] font-semibold text-black/60">{t.rates.fixedKicker}</span>
              <span className="serif block text-[30px] md:text-[38px] leading-tight">{r.airportCard}</span>
            </span>
            <span className="serif text-[34px]">{av.small} <span className="text-[16px]">/ {av.large}</span></span>
          </a>
        </div>
      </section>
      <section className="bg-[#0A0A0A] border-t border-white/5">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-14 space-y-12">
          {zones.map(z => (
            <div key={z}>
              <h2 className="text-[11px] tracking-[0.3em] text-[#C5A46A]">{z.toUpperCase()}</h2>
              <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {all.filter(x => x.dest && (x.dest.zone || '—') === z).map(x => (
                  <a key={x.key} href={routePath(x, lang)} className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 flex items-center justify-between gap-3 hover:border-[#C5A46A]/50 transition">
                    <span className="min-w-0">
                      <span className="serif block text-[20px] truncate">{x.dest.name}</span>
                      <span className="block text-[11px] text-white/40">{x.dest.km} km</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[10px] tracking-[0.15em] text-white/40">{r.fromPrice.toUpperCase()}</span>
                      <span className="serif text-[22px] text-[#C5A46A]">{money(x.dest.t1, lang)}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
