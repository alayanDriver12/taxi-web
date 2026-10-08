import { useEffect, useState } from 'react';
import { submitBooking } from './pay.js';

const EMPTY_FORM = {
  name: '', company: '', phone: '', email: '', origin: '', destination: '',
  date: '', time: '', pax: '2', luggage: '2', flight: '', sign: '', amount: ''
};
const FORM_FIELDS = [
  ['name'], ['company'], ['phone'], ['email'], ['origin'], ['destination'],
  ['date', 'date'], ['time', 'time'], ['pax'], ['luggage'], ['flight'], ['sign']
];
const WIDE_FIELDS = new Set(['origin', 'destination', 'flight', 'sign']);

// Sustituye {clave} por su valor: "© {year}" → "© 2026"
const fill = (tpl, vars) => String(tpl ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

export default function App({ content }) {
  const [lang, setLang] = useState('ES');
  const [form, setForm] = useState(EMPTY_FORM);
  const t = content[lang];
  const img = content.images;
  const waBase = `https://wa.me/${content.contact.whatsapp}`;

  useEffect(() => { document.documentElement.lang = lang.toLowerCase(); }, [lang]);

  const langButton = code => (
    <button
      onClick={() => setLang(code)}
      className={`text-[12px] tracking-[0.2em] font-medium px-2 py-1 rounded ${lang === code ? 'bg-[#C5A46A] text-black' : 'text-white/60 hover:text-white'}`}
    >
      {code}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F7F3ED] antialiased selection:bg-[#C5A46A]/30">
      {/* Cabecera */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={img.logo} alt={`${t.brand.name} logo`} className="h-[44px] w-auto rounded-[10px] object-contain bg-white p-1" />
            <div className="hidden md:block h-[32px] w-px bg-white/10" />
            <div className="hidden md:block leading-none">
              <div className="serif text-[18px] font-semibold tracking-wide">{t.brand.name}</div>
              <div className="text-[10px] tracking-[0.28em] text-[#C5A46A] mt-0.5">{t.brand.tagline}</div>
            </div>
          </div>
          <nav className="hidden xl:flex items-center gap-8 text-[11px] tracking-[0.18em] text-white/60">
            <a href="#flota" className="hover:text-white transition">{t.nav.fleet}</a>
            <a href="#clases" className="hover:text-white transition">{t.nav.classes}</a>
            <a href="#conductores" className="hover:text-white transition">{t.nav.drivers}</a>
            <a href="#destinos" className="hover:text-white transition">{t.nav.destinations}</a>
            <a href="#servicios" className="hover:text-white transition">{t.nav.services}</a>
          </nav>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {langButton('ES')}
              <span className="text-white/20">|</span>
              {langButton('EN')}
            </div>
            <a href="#reserva" className="hidden md:inline-flex h-10 px-6 items-center justify-center rounded-full bg-white text-black text-[11px] tracking-[0.2em] font-semibold hover:bg-[#F7F3ED] transition">
              {t.nav.book.toUpperCase()}
            </a>
            <a href={waBase} target="_blank" rel="noopener" className="h-10 w-10 grid place-items-center rounded-full border border-[#C5A46A]/40 text-[#C5A46A] hover:bg-[#C5A46A] hover:text-black transition">
              WA
            </a>
          </div>
        </div>
      </header>

      {/* Portada */}
      <section className="relative w-full bg-[#080808] flex flex-col items-center justify-center overflow-hidden">
        {t.hero.badge && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-full bg-black/70 border border-[#C5A46A]/30 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[#C5A46A] animate-pulse" />
            <span className="text-[10px] tracking-[0.32em] text-[#C5A46A]">{t.hero.badge}</span>
          </div>
        )}
        <div className="relative w-full max-w-[1600px] mx-auto flex items-center justify-center py-10 md:py-0">
          <img src={img.hero} alt={t.hero.alt} className="w-full h-auto max-h-[92vh] object-contain object-center select-none" />
          <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[18%] bg-gradient-to-t from-[#0A0A0A] to-transparent" />
        </div>
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3">
          <a href="#experiencia" className="group flex flex-col items-center gap-2">
            <span className="text-[10px] tracking-[0.4em] text-white/50 group-hover:text-white/80 transition">{t.hero.scroll}</span>
            <span className="h-12 w-[1px] bg-gradient-to-b from-[#C5A46A] to-transparent" />
          </a>
        </div>
      </section>

      {/* Experiencia */}
      <section id="experiencia" className="relative bg-[#F7F3ED] text-[#0A0A0A]">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-20 md:py-28 grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <div className="text-[11px] tracking-[0.35em] text-[#C5A46A] font-semibold">{t.exp.kicker}</div>
            <h2 className="serif text-[44px] md:text-[64px] leading-[0.95] mt-4 font-medium">{t.exp.title}</h2>
            <p className="mt-6 text-[16px] md:text-[18px] leading-relaxed text-black/70 max-w-[560px]">{t.exp.desc}</p>
            <div className="mt-10 flex gap-3">
              <a href="#reserva" className="h-12 px-8 inline-flex items-center justify-center rounded-full bg-[#0A0A0A] text-white text-[12px] tracking-[0.2em]">
                {t.exp.cta.toUpperCase()}
              </a>
              <div className="hidden md:flex items-center gap-2 text-[11px] tracking-[0.2em] text-black/50">
                <span className="h-px w-10 bg-black/20" /> {t.footer.slogan}
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-[32px] bg-white p-8 md:p-10 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.2)] border border-black/5">
              <div className="grid grid-cols-2 gap-8">
                {t.exp.stats.map((s, i) => (
                  <div key={i}>
                    <div className="serif text-[42px] leading-none">{s.value}</div>
                    <div className="text-[11px] tracking-[0.2em] text-black/50 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-10 pt-8 border-t border-black/10 text-[12px] tracking-[0.2em]">{t.exp.values}</div>
            </div>
            <div className="absolute -right-6 -bottom-6 hidden md:block h-24 w-24 rounded-[20px] bg-[#C5A46A] -z-10" />
          </div>
        </div>
      </section>

      {/* Flota */}
      <section id="flota" className="bg-[#0A0A0A] border-t border-white/5">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <h2 className="serif text-[32px] md:text-[48px] leading-none max-w-[560px]">
              {t.fleet.title}
              <br />
              <span className="text-white/40">{t.slogans.left} {t.slogans.right}</span>
            </h2>
            <p className="text-[13px] leading-relaxed text-white/50 max-w-[420px]">{t.fleet.subtitle} — {t.slogans.hybrid}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <div className="group relative overflow-hidden rounded-[28px] bg-[#111] border border-white/10">
              <img src={img.ford} alt={t.fleet.ford.name} className="w-full h-[360px] md:h-[460px] object-cover group-hover:scale-[1.02] transition duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-0 p-7 md:p-8">
                <div className="inline-flex px-3 py-1 rounded-full bg-[#C5A46A] text-black text-[10px] tracking-[0.2em] font-semibold mb-3">{t.fleet.ford.plate}</div>
                <div className="serif text-[28px] leading-none">{t.fleet.ford.name}</div>
                <div className="text-[13px] text-white/60 mt-2 max-w-[380px]">{t.fleet.ford.desc}</div>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-[28px] bg-[#111] border border-white/10">
              <img src={img.tesla} alt={t.fleet.tesla.name} className="w-full h-[360px] md:h-[460px] object-cover group-hover:scale-[1.02] transition duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-0 p-7 md:p-8">
                <div className="inline-flex px-3 py-1 rounded-full bg-white text-black text-[10px] tracking-[0.2em] font-semibold mb-3">{t.fleet.tesla.plate}</div>
                <div className="serif text-[28px] leading-none">{t.fleet.tesla.name}</div>
                <div className="text-[13px] text-white/60 mt-2 max-w-[380px]">{t.fleet.tesla.desc}</div>
              </div>
              {t.fleet.tesla.badge && (
                <div className="absolute top-6 right-6 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-[10px] tracking-[0.2em] text-white/80">{t.fleet.tesla.badge}</div>
              )}
            </div>
          </div>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {t.slogans.items.map((item, i) => (
              <div key={i} className="h-[56px] rounded-full border border-white/10 bg-white/[0.03] grid place-items-center text-[11px] tracking-[0.3em] text-white/70">{item}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Clases */}
      <section id="clases" className="bg-[#F7F3ED] text-black">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-20 md:py-28">
          <div className="max-w-[720px]">
            <h2 className="serif text-[40px] md:text-[56px] leading-[0.95]">{t.classes.title}</h2>
            <p className="mt-3 text-black/60">{t.classes.subtitle}</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {t.classes.cards.map((card, i) => (
              <div
                key={i}
                className={`relative rounded-[28px] border p-8 flex flex-col ${card.popular ? 'bg-[#0A0A0A] text-white border-[#0A0A0A] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]' : 'bg-white border-black/10'}`}
              >
                {card.popular && (
                  <div className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-[#C5A46A] text-black text-[10px] tracking-[0.2em] font-semibold">{t.classes.popular}</div>
                )}
                <div className="serif text-[32px]">{card.name}</div>
                <div className={`mt-2 text-[13px] ${card.popular ? 'text-[#C5A46A]' : 'text-black/60'}`}>{card.price}</div>
                <div className="mt-8 space-y-3">
                  {card.features.map((f, j) => (
                    <div key={j} className="flex gap-3 text-[13px]">
                      <span className={`mt-1 h-1.5 w-1.5 rounded-full ${card.popular ? 'bg-[#C5A46A]' : 'bg-black/30'}`} />
                      {f}
                    </div>
                  ))}
                </div>
                <a
                  href="#reserva"
                  className={`mt-10 h-11 rounded-full grid place-items-center text-[11px] tracking-[0.2em] font-semibold ${card.popular ? 'bg-white text-black' : 'bg-black text-white'}`}
                >
                  {t.classes.book} {card.name.toUpperCase()}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conductores */}
      <section id="conductores" className="bg-[#0A0A0A] border-t border-white/5">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-20 md:py-28 grid lg:grid-cols-[0.9fr_1.1fr] gap-12">
          <div>
            <div className="text-[11px] tracking-[0.35em] text-[#C5A46A]">{t.drivers.subtitle.toUpperCase()}</div>
            <h2 className="serif text-[42px] md:text-[56px] leading-[0.95] mt-4">{t.drivers.title}</h2>
            <div className="mt-8 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <img src={img.logo} alt="" className="h-8 w-8 rounded-full object-cover" />
              <span className="text-[11px] tracking-[0.2em] text-white/70">{t.drivers.team}</span>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {t.drivers.points.map((p, i) => (
              <div key={i} className="rounded-[20px] bg-white/[0.04] border border-white/10 p-7">
                <div className="h-8 w-8 rounded-full bg-[#C5A46A] text-black grid place-items-center text-[13px] font-bold">{i + 1}</div>
                <div className="serif text-[20px] mt-4 leading-tight">{p.title}</div>
                <div className="text-[13px] leading-relaxed text-white/60 mt-2">{p.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Destinos */}
      <section id="destinos" className="bg-[#111] border-t border-white/5">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-20 md:py-28">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <h2 className="serif text-[36px] md:text-[48px] leading-[0.9] max-w-[520px]">{t.destinations.title}</h2>
            <p className="text-white/50 text-[13px] max-w-[380px]">{t.destinations.subtitle}</p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {t.destinations.list.map((d, i) => (
              <div key={i} className="group rounded-[20px] bg-[#0A0A0A] border border-white/10 p-6 hover:border-[#C5A46A]/40 transition">
                <div className="flex justify-between items-start">
                  <div className="text-[11px] tracking-[0.3em] text-[#C5A46A]">{d.city.toUpperCase()}</div>
                  <div className="h-6 w-6 rounded-full border border-white/10 grid place-items-center text-[10px] text-white/40">↗</div>
                </div>
                <div className="serif text-[22px] mt-3">{d.monument}</div>
                <div className="text-[12px] text-white/50 mt-2">{d.note}</div>
                <div className="mt-6 h-px w-full bg-gradient-to-r from-[#C5A46A]/40 to-transparent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="bg-[#F7F3ED] text-black">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-20 md:py-24">
          <h2 className="serif text-[36px] md:text-[48px]">{t.services.title}</h2>
          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {t.services.items.map((s, i) => (
              <div key={i} className="rounded-[18px] bg-white border border-black/10 p-5 flex flex-col gap-2">
                <div className="text-[11px] tracking-[0.28em] font-semibold text-black/40">{s.name}</div>
                <div className="text-[13px] leading-snug font-medium tracking-wide">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reserva */}
      <section id="reserva" className="bg-[#0A0A0A] border-t border-white/10">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-20 md:py-28 grid lg:grid-cols-[0.9fr_1.1fr] gap-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A46A]/15 border border-[#C5A46A]/30 text-[#C5A46A] text-[10px] tracking-[0.2em]">{t.booking.badge}</div>
            <h2 className="serif text-[40px] md:text-[52px] leading-[0.95] mt-6">{t.booking.title}</h2>
            <p className="text-white/60 mt-4 max-w-[460px]">{t.booking.subtitle}</p>
            <div className="mt-10 rounded-[20px] bg-white/[0.04] border border-white/10 p-6">
              <div className="text-[12px] tracking-[0.2em] text-white/60">{t.booking.includesTitle}</div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[12px] text-white/70">
                {t.booking.includes.map((item, i) => <div key={i}>✓ {item}</div>)}
              </div>
              <div className="mt-6 text-[11px] leading-relaxed text-white/40">{t.booking.cancel}</div>
            </div>
            <div className="mt-8 flex gap-3">
              <img src={img.ford} className="h-16 w-24 object-cover rounded-xl border border-white/10" alt="" />
              <img src={img.tesla} className="h-16 w-24 object-cover rounded-xl border border-white/10" alt="" />
              <div className="text-[11px] text-white/50 leading-relaxed">
                {t.booking.fleetNote}
                <br />
                {t.booking.fleetSign}
              </div>
            </div>
          </div>
          <div className="rounded-[28px] bg-[#F7F3ED] text-black p-6 md:p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
            <div className="grid md:grid-cols-2 gap-4">
              {FORM_FIELDS.map(([key, type]) => (
                <div key={key} className={WIDE_FIELDS.has(key) ? 'md:col-span-2' : ''}>
                  <label className="text-[11px] tracking-[0.18em] text-black/60">{t.booking.fields[key]}</label>
                  <input
                    type={type || 'text'}
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="mt-1.5 w-full h-11 px-4 rounded-full bg-white border border-black/10 text-[14px] outline-none focus:border-[#C5A46A] focus:ring-2 focus:ring-[#C5A46A]/20"
                    placeholder={key === 'sign' ? t.booking.placeholders.sign : ''}
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="text-[11px] tracking-[0.18em] text-black/60">{t.booking.fields.amount}</label>
                <input
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder={t.booking.placeholders.amount}
                  className="mt-1.5 w-full h-11 px-4 rounded-full bg-white border border-black/10 text-[14px] outline-none focus:border-[#C5A46A]"
                />
              </div>
            </div>
            <div className="mt-8 grid md:grid-cols-[1.2fr_0.8fr] gap-3">
              <button
                onClick={() => submitBooking(form)}
                className="h-12 rounded-full bg-[#0A0A0A] text-white text-[12px] tracking-[0.22em] font-semibold flex items-center justify-center gap-2 hover:bg-black transition"
              >
                <span className="h-6 w-6 rounded-full bg-[#C5A46A] text-black grid place-items-center font-bold text-[12px]">€</span>
                {t.booking.pay.toUpperCase()}
              </button>
              <a
                href={`${waBase}?text=${encodeURIComponent(fill(t.booking.whatsappMessage, form))}`}
                target="_blank"
                rel="noopener"
                className="h-12 rounded-full border border-black/15 grid place-items-center text-[12px] tracking-[0.18em] font-semibold"
              >
                {t.booking.whatsapp.toUpperCase()}
              </a>
            </div>
            <div className="mt-4 text-center text-[11px] tracking-wide text-black/50">{t.booking.secure}</div>
          </div>
        </div>
      </section>

      {/* Pie */}
      <footer className="bg-[#070707] border-t border-white/10">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-14 flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-3">
              <img src={img.logo} alt="" className="h-10 w-auto rounded-lg bg-white p-1" />
              <div className="serif text-[20px] leading-none">
                {t.brand.name}
                <br />
                <span className="text-[11px] tracking-[0.28em] text-[#C5A46A]">{t.brand.tagline}</span>
              </div>
            </div>
            <div className="mt-6 text-[13px] text-white/60 max-w-[420px]">
              {t.footer.tagline} {t.footer.slogan}. {t.footer.description}
            </div>
            <div className="mt-6 serif italic text-[#C5A46A] text-[18px]">— {t.footer.firm}</div>
          </div>
          <div className="text-[11px] tracking-[0.2em] text-white/40 leading-relaxed">
            {t.footer.services.map((s, i) => <div key={i}>{s}</div>)}
            <br />
            <span className="text-white/60">{fill(t.footer.rights, { year: new Date().getFullYear() })}</span>
          </div>
        </div>
        <div className="border-t border-white/5 bg-black/40">
          <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-6 flex items-center justify-between">
            <span className="text-[10px] tracking-[0.32em] text-white/30">{t.footer.bottomLeft}</span>
            <span className="text-[10px] tracking-[0.2em] text-[#C5A46A]">{t.footer.bottomRight}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
