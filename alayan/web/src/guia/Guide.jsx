// Guía de Sevilla para los clientes de Joaquín (/guia). Página independiente de la web principal:
// sin menú ni enlaces a ella; solo comparte servidor y el número de WhatsApp del panel.
import { useEffect, useState } from 'react';
import { TEXTS, IMAGES } from './texts.js';

const LANGS = [
  { code: 'es', short: 'ES', label: 'Español' },
  { code: 'en', short: 'GB', label: 'English' },
  { code: 'it', short: 'IT', label: 'Italiano' },
  { code: 'fr', short: 'FR', label: 'Français' }
];

function initialLang() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (TEXTS[fromUrl]) return fromUrl;
  try { const saved = localStorage.getItem('guia-lang'); if (TEXTS[saved]) return saved; } catch {}
  const nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
  return TEXTS[nav] ? nav : 'es';
}

// 34620331295 → +34 620 33 12 95
function prettyPhone(n) {
  const d = String(n || '');
  if (d.length === 11 && d.startsWith('34')) return `+34 ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
  return d ? '+' + d : '';
}

const gold = '#c8a96a';

function Avatar({ letter = 'J', size = 'h-9 w-9 text-[12px]', dark }) {
  return (
    <span className={`${size} shrink-0 rounded-full grid place-items-center font-bold ${dark ? 'bg-black text-[#c8a96a]' : 'bg-gradient-to-br from-[#d9bf86] to-[#a9843d] text-black shadow-[0_6px_20px_rgba(200,169,106,0.35)]'}`}>
      {letter}
    </span>
  );
}

function WhatsappIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.5.7 4.9 2 6.9L3 29l6.7-2.2c1.9 1.1 4.1 1.6 6.3 1.6 7 0 12.7-5.6 12.7-12.6S23 3 16 3zm0 23c-2 0-3.9-.5-5.6-1.6l-.4-.2-4 1.3 1.3-3.9-.3-.4c-1.2-1.7-1.8-3.7-1.8-5.7C5.2 9.8 10 5.2 16 5.2s10.7 4.6 10.7 10.4S22 26 16 26zm5.9-7.8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z" />
    </svg>
  );
}

function PhoneIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

export default function Guide({ whatsapp }) {
  const [lang, setLang] = useState(initialLang);
  const [toast, setToast] = useState('');
  const t = TEXTS[lang], u = t.ui;
  const city = u.brandSub.split(' • ')[0];
  const waLink = whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(u.waMessage)}` : null;
  const telLink = whatsapp ? `tel:+${whatsapp}` : null;
  const [restTitle, restAccent] = t.restaurantsTitle.split(/\s+—\s+/);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = u.shareTitle;
    try { localStorage.setItem('guia-lang', lang); } catch {}
    const url = new URL(location.href);
    if (lang === 'es') url.searchParams.delete('lang'); else url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
  }, [lang]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  async function share() {
    const data = { title: u.shareTitle, url: location.href };
    try {
      if (navigator.share) return await navigator.share(data);
      await navigator.clipboard.writeText(location.href);
      setToast(u.copied);
    } catch {}
  }

  return (
    <div className="min-h-screen">
      {/* ---------- Portada ---------- */}
      <header className="relative overflow-hidden bg-black text-white">
        <img src="/img/guia/portada.jpg" alt="Alayan Driver" className="absolute inset-0 h-full w-full object-cover object-[72%_center] md:object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
        <div className="relative mx-auto max-w-[1440px] px-5 md:px-10">
          <div className="flex items-center gap-3 pt-6">
            <Avatar letter="A" size="h-10 w-10 text-[13px]" />
            <div>
              <div className="text-[11px] tracking-[0.25em] font-bold">ALAYAN DRIVER</div>
              <div className="text-[10px] tracking-[0.2em] text-white/60">{u.brandSub.toUpperCase()}</div>
            </div>
          </div>
          <div className="pt-[28vh] md:pt-44 pb-12 md:pb-16 max-w-[760px] rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 backdrop-blur px-3 py-1.5 text-[10px] tracking-[0.2em] font-bold">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: gold }} />{t.badge}
            </span>
            <div className="mt-5 text-[12px] md:text-[13px] tracking-[0.35em] font-medium" style={{ color: gold }}>{u.kicker}</div>
            <h1 className="mt-2 text-[44px] leading-[1] md:text-[80px] font-bold tracking-tight">{t.welcomeTitle}</h1>
            <p className="serif mt-2 text-[28px] md:text-[42px] leading-tight">{t.welcomeSub}</p>
            <p className="mt-4 max-w-[560px] text-[14px] md:text-[16px] leading-relaxed text-white/80">{t.welcomeP}</p>
          </div>
        </div>
      </header>

      {/* ---------- Mensaje personal ---------- */}
      <section className="bg-[#fffbf2]">
        <div className="mx-auto max-w-[1440px] px-5 md:px-10 py-12 md:py-16 grid lg:grid-cols-[1fr_360px] gap-10 lg:gap-14">
          <div className="lg:border-r lg:border-[#e9e0cf] lg:pr-14">
            <div className="flex items-center gap-3">
              <Avatar />
              <span className="text-[10px] md:text-[11px] tracking-[0.22em] font-bold uppercase text-[#a9843d]">{t.personal.titleSmall}</span>
            </div>
            <h2 className="serif mt-5 text-[32px] md:text-[46px] leading-[1.05] font-bold max-w-[760px]">{t.personal.big}</h2>
            <p className="mt-5 max-w-[680px] text-[15px] leading-relaxed text-[#6b6257]">{t.personal.para}</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {[t.personal.pill1, t.personal.pill2].map(p => (
                <span key={p} className="rounded-full border border-[#ecd9ab] bg-[#fff6df] px-3.5 py-1.5 text-[12px] font-medium text-[#7a6230]">{p}</span>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={share} className="h-[46px] px-7 rounded-full bg-black text-white text-[12px] tracking-[0.18em] font-bold uppercase hover:bg-[#1a1a1a] active:scale-[0.98] transition">{t.personal.share}</button>
              <a href="#monumentos" className="h-[46px] px-7 rounded-full bg-white text-black border border-[#d9c08a] text-[12px] tracking-[0.18em] font-bold uppercase grid place-items-center hover:bg-[#fff8e7] transition">{t.personal.view}</a>
            </div>
          </div>
          <aside className="self-start rounded-[22px] border border-[#ecd9ab] bg-[#fbf6ea] p-6 shadow-[0_20px_50px_rgba(169,132,61,0.12)]">
            <div className="text-[10px] tracking-[0.25em] font-bold text-[#a9843d]">{u.sideKicker}</div>
            <p className="serif mt-2 text-[24px] italic leading-snug">{u.sideQuote}</p>
            <div className="my-4 h-px bg-[#e9e0cf]" />
            <p className="text-[13px] leading-relaxed text-[#6b6257]">{u.sideText}</p>
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener" className="mt-5 flex h-11 items-center justify-center gap-2 rounded-full bg-[#1f8f4e] text-white text-[12px] font-bold tracking-[0.08em] hover:brightness-110 transition">
                <WhatsappIcon className="h-4 w-4" />{u.whatsapp}
              </a>
            )}
          </aside>
        </div>
      </section>

      {/* ---------- Idioma ---------- */}
      <nav className="sticky top-0 z-30 bg-[#14120f]/95 backdrop-blur border-b-2 border-[#a9843d] text-white" aria-label="Idioma / Language">
        <div className="mx-auto max-w-[1440px] px-5 md:px-10 py-3 flex items-center gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="hidden md:flex items-center gap-3 pr-5 border-r border-white/10 shrink-0">
            <Avatar letter="ID" />
            <div>
              <div className="text-[10px] tracking-[0.2em] font-bold" style={{ color: gold }}>{u.langTitle}</div>
              <div className="text-[11px] text-white/60">{u.langSub}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 md:flex gap-1.5 md:gap-2 w-full md:w-auto shrink-0">
            {LANGS.map(l => {
              const on = l.code === lang;
              return (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  aria-pressed={on}
                  className={`h-11 md:h-12 px-2 md:px-6 rounded-xl border flex items-center justify-center gap-2.5 text-[13px] font-bold tracking-[0.06em] transition ${on ? 'bg-[#c8a96a] border-[#c8a96a] text-black' : 'border-white/15 text-white/85 hover:border-white/40'}`}
                >
                  <span className={`hidden md:inline text-[11px] ${on ? 'text-black/60' : 'text-white/45'}`}>{l.short}</span>
                  <span className="md:hidden">{l.code.toUpperCase()}</span>
                  <span className="hidden md:inline">{l.label.toUpperCase()}</span>
                  {on && <span className="hidden md:grid h-5 w-5 rounded-full bg-black text-white place-items-center text-[10px]">✓</span>}
                </button>
              );
            })}
          </div>
          <div className="hidden xl:block ml-auto pl-5 border-l border-white/10 text-[10px] tracking-[0.2em] text-white/45 shrink-0">{u.langNote.toUpperCase()}</div>
        </div>
      </nav>

      {/* ---------- Monumentos ---------- */}
      <section id="monumentos" className="bg-[#0e0d0c] text-[#f6f0e6] scroll-mt-20">
        <div className="mx-auto max-w-[1440px] px-5 md:px-10 py-14 md:py-20">
          <div className="flex items-center gap-3 text-[10px] tracking-[0.3em] font-bold" style={{ color: gold }}>
            <span className="h-px w-8" style={{ background: gold }} />{u.selection}
          </div>
          <div className="mt-3 flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div>
              <h2 className="serif text-[34px] md:text-[56px] leading-[1.02] font-bold">{t.monumentsTitle}</h2>
              <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-[#b8afa0]">{t.monumentsSub}</p>
            </div>
            <div className="md:text-right shrink-0">
              <div className="text-[11px] tracking-[0.2em] text-[#b8afa0]">{u.monCount}</div>
              <div className="serif italic text-[20px]">{u.monWalk}</div>
            </div>
          </div>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {t.monuments.map((m, i) => (
              <article key={m.name} className="group overflow-hidden rounded-[22px] border border-[#2a2622] bg-[#171412] transition duration-500 hover:-translate-y-1">
                <div className="relative h-[220px] overflow-hidden bg-[#201d1a]">
                  <img src={`/img/guia/${IMAGES.monuments[i]}.jpg`} alt={m.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.06]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                  <span className="absolute top-3 left-3 rounded-full bg-black/70 px-3 py-1 text-[10px] tracking-[0.15em] font-bold">{String(i + 1).padStart(2, '0')} • {city.toUpperCase()}</span>
                  <h3 className="serif absolute bottom-3 left-4 right-4 text-[26px] leading-[1.05] font-bold">{m.name}</h3>
                </div>
                <div className="p-5">
                  <p className="text-[14px] leading-relaxed text-[#b8afa0]">{m.desc}</p>
                  <div className="mt-4 flex items-center gap-2 text-[10px] tracking-[0.2em] font-bold" style={{ color: gold }}>
                    <span className="h-px w-5" style={{ background: gold }} />{u.guided}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Dónde comer ---------- */}
      <section className="bg-[#0e0d0c] text-[#f6f0e6] border-t border-white/5">
        <div className="mx-auto max-w-[1440px] px-5 md:px-10 py-14 md:py-20">
          <div className="flex items-center gap-4">
            <Avatar letter="✦" size="h-12 w-12 text-[16px]" />
            <span className="hidden sm:block h-px w-12" style={{ background: gold }} />
            <span className="text-[10px] tracking-[0.28em] font-bold" style={{ color: gold }}>{u.restKicker}</span>
          </div>
          <h2 className="mt-7 text-[36px] md:text-[64px] leading-[0.98] font-bold uppercase tracking-tight">
            {restTitle}
            {restAccent && <span className="block" style={{ color: gold }}>{restAccent}</span>}
          </h2>
          <p className="mt-4 max-w-[560px] text-[15px] leading-relaxed text-[#b8afa0]">{t.restaurantsSub}</p>
          <div className="mt-10 grid md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
            {t.restaurants.map((r, i) => (
              <article key={r.name} className="group overflow-hidden rounded-[22px] border border-[#2a2622] bg-[#171412] transition duration-500 hover:-translate-y-1.5">
                <div className="relative h-[220px] overflow-hidden bg-[#1f1c18]">
                  <img src={`/img/guia/${IMAGES.restaurants[i]}.jpg`} alt={r.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1000ms] group-hover:scale-[1.08]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <span className="absolute top-3 left-3 rounded-full bg-black/70 px-3 py-1 text-[10px] font-bold">• {r.loc}</span>
                  <span className="absolute top-3 right-3 rounded-full px-3 py-1 text-[10px] tracking-[0.1em] font-bold text-black" style={{ background: gold }}>#{i + 1} {u.favorite}</span>
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
                    <h3 className="serif text-[28px] leading-none font-bold">{r.name}</h3>
                    <span className="shrink-0 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold" style={{ color: gold }}>{r.rating}</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    <span className="text-[#b8afa0]">{r.price}</span>
                    <span className="tracking-[0.18em] font-bold" style={{ color: gold }}>{u.recommended}</span>
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-[#b8afa0]">{r.desc}</p>
                  <div className="mt-4 flex gap-3 rounded-2xl border border-[#2a2622] bg-[#201d1a] p-4">
                    <Avatar size="h-8 w-8 text-[11px]" />
                    <div>
                      <div className="text-[10px] tracking-[0.2em] font-bold" style={{ color: gold }}>{t.joaquinTip.toUpperCase()}</div>
                      <p className="serif mt-1 text-[16px] italic leading-snug">“{r.rec}”</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Consejos ---------- */}
      <section className="dots bg-[#121110] text-[#f6f0e6] border-t border-[#a9843d]/30">
        <div className="mx-auto max-w-[1440px] px-5 md:px-10 py-14 md:py-20">
          <div className="text-[10px] tracking-[0.3em] font-bold" style={{ color: gold }}>{t.expert.small}</div>
          <h2 className="serif mt-2 text-[34px] md:text-[52px] leading-none font-bold">{t.expert.title}</h2>
          <div className="mt-9 grid md:grid-cols-3 gap-5">
            {t.expert.cards.map(c => (
              <div key={c.kicker} className="rounded-[20px] border border-white/10 bg-[#1d1b19] p-6 flex flex-col">
                <div className="text-[10px] tracking-[0.22em] font-bold uppercase" style={{ color: gold }}>{c.kicker}</div>
                <p className="mt-3 text-[15px] leading-relaxed text-white/85 flex-1">“{c.text}”</p>
                <div className="mt-5 flex items-center gap-2.5 text-[10px] tracking-[0.18em] font-bold text-white/50">
                  <Avatar size="h-7 w-7 text-[10px]" />{u.signature}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-center gap-4">
            <span className="h-px flex-1 bg-gradient-to-r from-[#a9843d]/60 to-transparent" />
            <span className="text-[10px] tracking-[0.28em] font-bold text-white/45">{t.expert.footer}</span>
            <span className="h-px w-10 bg-white/15" />
          </div>
        </div>
      </section>

      {/* ---------- Contacto ---------- */}
      {whatsapp && (
        <section className="bg-[#c8a96a] text-black">
          <div className="mx-auto max-w-[1440px] px-5 md:px-10 py-10 md:py-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="serif text-[30px] md:text-[40px] leading-tight font-bold">{u.bookCta}</h2>
              <p className="mt-1 text-[15px] font-medium text-black/70">{t.footerCta}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <a href={waLink} target="_blank" rel="noopener" className="h-12 px-6 rounded-full bg-black text-white flex items-center justify-center gap-2.5 text-[12px] tracking-[0.12em] font-bold uppercase hover:bg-[#1a1a1a] transition">
                <WhatsappIcon />{u.whatsapp}
              </a>
              <a href={telLink} className="h-12 px-6 rounded-full border-2 border-black/80 flex items-center justify-center gap-2.5 text-[13px] font-bold hover:bg-black/5 transition">
                <PhoneIcon />{u.call} · {prettyPhone(whatsapp)}
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ---------- Pie ---------- */}
      <footer className="bg-[#1a1714] text-[#f6f0e6]">
        <div className="mx-auto max-w-[1440px] px-5 md:px-10 py-12 md:py-14 grid lg:grid-cols-[1fr_auto] gap-10">
          <div>
            <div className="flex items-center gap-3">
              <Avatar letter="A" size="h-10 w-10 text-[13px]" dark />
              <span className="serif text-[26px] font-bold">{t.footerTitle}</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {t.footerValues.map(v => (
                <span key={v} className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[10px] tracking-[0.2em] font-bold text-white/70">{v}</span>
              ))}
            </div>
            <p className="mt-5 max-w-[520px] text-[14px] leading-relaxed text-white/65">{t.footerDesc}</p>
            <p className="serif mt-4 text-[19px] italic">{t.footerCta}</p>
          </div>
          <div className="lg:text-right">
            <div className="rounded-[20px] border border-white/10 bg-[#0e0d0c] p-5 text-left lg:min-w-[320px]">
              <div className="text-[10px] tracking-[0.22em] font-bold" style={{ color: gold }}>{u.driverKicker}</div>
              <div className="mt-2 text-[13px] text-white/75">{u.driverText} ES · EN · IT · FR</div>
              {whatsapp && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-bold">
                  <a href={waLink} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 hover:underline" style={{ color: gold }}><WhatsappIcon className="h-4 w-4" />WhatsApp</a>
                  <a href={telLink} className="inline-flex items-center gap-1.5 text-white/80 hover:underline"><PhoneIcon />{prettyPhone(whatsapp)}</a>
                </div>
              )}
            </div>
            <div className="mt-5 text-[11px] text-white/45">{u.rights.replace('{year}', new Date().getFullYear())}</div>
          </div>
        </div>
      </footer>

      {/* Botón flotante de WhatsApp */}
      {waLink && (
        <a href={waLink} target="_blank" rel="noopener" aria-label={u.whatsapp} className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-[#1f8f4e] text-white grid place-items-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:scale-105 transition">
          <WhatsappIcon className="h-7 w-7" />
        </a>
      )}

      {toast && (
        <div role="status" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-full bg-black text-white px-5 py-2.5 text-[13px] shadow-lg">{toast}</div>
      )}
    </div>
  );
}
