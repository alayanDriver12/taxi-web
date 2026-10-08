// Sección «Flota»: una tarjeta por vehículo con carrusel de fotos (las fotos se gestionan en /admin/flota)
import { useRef, useState } from 'react';

function Carousel({ images, alt }) {
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
        className="flex h-[360px] md:h-[460px] overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={i === 0 ? alt : ''}
            loading={i === 0 ? 'eager' : 'lazy'}
            className="w-full h-full flex-none snap-center object-cover"
          />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="‹"
            className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 border border-white/20 text-white grid place-items-center backdrop-blur hover:bg-[#C5A46A] hover:text-black transition"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="›"
            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 border border-white/20 text-white grid place-items-center backdrop-blur hover:bg-[#C5A46A] hover:text-black transition"
          >
            ›
          </button>
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

export default function Fleet({ t, cars, lang }) {
  return (
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
          {cars.map((car, i) => {
            const c = car[lang];
            return (
              <div key={car.id} className="group relative overflow-hidden rounded-[28px] bg-[#111] border border-white/10">
                <Carousel images={car.images} alt={c.name} />
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
          })}
        </div>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
          {t.slogans.items.map((item, i) => (
            <div key={i} className="h-[56px] rounded-full border border-white/10 bg-white/[0.03] grid place-items-center text-[11px] tracking-[0.3em] text-white/70">{item}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
