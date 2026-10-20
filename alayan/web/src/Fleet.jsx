// Sección «Flota»: carrusel de vehículos y, dentro de cada uno, carrusel de fotos.
// Los coches, sus textos y sus fotos se gestionan en /admin/flota.
import { useEffect, useRef, useState } from 'react';

const arrow = 'grid place-items-center rounded-full border transition disabled:opacity-30 disabled:pointer-events-none';

// Carrusel de fotos de un coche (deslizar sobre la foto no mueve el carrusel de coches)
function Photos({ images, alt }) {
  const track = useRef(null);
  const [index, setIndex] = useState(0);

  const go = i => {
    const el = track.current;
    if (!el) return;
    const next = (i + images.length) % images.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  };
  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (!images.length) return <div className="w-full h-[360px] md:h-[460px] bg-[#111]" />;

  return (
    <>
      <div
        ref={track}
        onScroll={onScroll}
        className="flex h-[360px] md:h-[460px] overflow-x-auto snap-x snap-mandatory overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={i === 0 ? alt : ''}
            loading="lazy"
            draggable="false"
            className="w-full h-full flex-none snap-center object-cover"
          />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => go(index - 1)} aria-label="‹" className={`${arrow} absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/50 border-white/20 text-white backdrop-blur hover:bg-[#C5A46A] hover:text-black`}>‹</button>
          <button type="button" onClick={() => go(index + 1)} aria-label="›" className={`${arrow} absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/50 border-white/20 text-white backdrop-blur hover:bg-[#C5A46A] hover:text-black`}>›</button>
          <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => go(i)}
                aria-label={`${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-[#C5A46A]' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function CarCard({ car, lang, i }) {
  const c = car[lang];
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[#111] border border-white/10 h-full">
      <Photos images={car.images} alt={c.name} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 p-7 md:p-8">
        {c.plate && (
          <div className={`inline-flex px-3 py-1 rounded-full text-black text-[10px] tracking-[0.2em] font-semibold mb-3 ${i % 2 ? 'bg-white' : 'bg-[#C5A46A]'}`}>{c.plate}</div>
        )}
        <div className="serif text-[28px] leading-none">{c.name}</div>
        <div className="text-[13px] text-white/60 mt-2 max-w-[380px]">{c.desc}</div>
      </div>
      {c.badge && (
        <div className="pointer-events-none absolute top-12 right-6 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-[10px] tracking-[0.2em] text-white/80">{c.badge}</div>
      )}
    </div>
  );
}

export default function Fleet({ t, cars, lang }) {
  const track = useRef(null);
  const [state, setState] = useState({ index: 0, pages: 1, perView: 1, overflow: false });

  // Cuántos coches caben a la vez y en cuál estamos (se recalcula al cambiar el tamaño)
  const measure = () => {
    const el = track.current;
    const card = el?.firstElementChild;
    if (!el || !card) return;
    const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || 0);
    const perView = Math.max(1, Math.round(el.clientWidth / step));
    const pages = Math.max(1, cars.length - perView + 1);
    const index = Math.min(pages - 1, Math.round(el.scrollLeft / step));
    setState({ index, pages, perView, overflow: el.scrollWidth > el.clientWidth + 2 });
  };
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [cars.length]);

  const go = i => {
    const el = track.current;
    const card = el?.children[Math.max(0, Math.min(cars.length - 1, i))];
    if (card) el.scrollTo({ left: card.offsetLeft - el.firstElementChild.offsetLeft, behavior: 'smooth' });
  };

  const { index, pages, overflow } = state;

  return (
    <section id="flota" className="bg-[#0A0A0A] border-t border-white/5">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-16 md:py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <h2 className="serif text-[32px] md:text-[48px] leading-none max-w-[560px]">
            {t.fleet.title}
            <br />
            <span className="text-white/40">{t.slogans.left} {t.slogans.right}</span>
          </h2>
          <div className="flex flex-col md:items-end gap-5">
            <p className="text-[13px] leading-relaxed text-white/50 max-w-[420px] md:text-right">{t.fleet.subtitle} — {t.slogans.hybrid}</p>
            {overflow && (
              <div className="hidden md:flex items-center gap-2">
                <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="‹" className={`${arrow} h-12 w-12 border-white/20 text-white text-[20px] hover:bg-[#C5A46A] hover:text-black hover:border-[#C5A46A]`}>‹</button>
                <button type="button" onClick={() => go(index + 1)} disabled={index >= pages - 1} aria-label="›" className={`${arrow} h-12 w-12 border-white/20 text-white text-[20px] hover:bg-[#C5A46A] hover:text-black hover:border-[#C5A46A]`}>›</button>
              </div>
            )}
          </div>
        </div>

        <div
          ref={track}
          onScroll={measure}
          className="flex gap-6 md:gap-8 overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-6 px-6 md:mx-0 md:px-0 scroll-px-6 md:scroll-px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {cars.map((car, i) => (
            <div key={car.id} className="flex-none w-[86%] md:w-[calc(50%-16px)] snap-start">
              <CarCard car={car} lang={lang} i={i} />
            </div>
          ))}
        </div>

        {overflow && (
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-8 bg-[#C5A46A]' : 'w-2 bg-white/25 hover:bg-white/50'}`}
              />
            ))}
          </div>
        )}

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
          {t.slogans.items.map((item, i) => (
            <div key={i} className="h-[56px] rounded-full border border-white/10 bg-white/[0.03] grid place-items-center text-[11px] tracking-[0.3em] text-white/70">{item}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
