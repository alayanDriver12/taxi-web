// Botones flotantes (abajo a la derecha) que aparecen al bajar: «Reservar» para ir directo al formulario
// y «↑» para volver arriba. «Reservar» se oculta cuando el formulario ya está en pantalla.
import { useEffect, useState } from 'react';

export default function FloatingActions({ t, lang, bookHref }) {
  const [show, setShow] = useState(false);
  const [bookingVisible, setBookingVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const el = document.getElementById('reserva');
    let io;
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(([e]) => setBookingVisible(e.isIntersecting), { threshold: 0.15 });
      io.observe(el);
    }
    return () => { window.removeEventListener('scroll', onScroll); io?.disconnect(); };
  }, []);

  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className={`fixed z-40 right-4 bottom-4 md:right-6 md:bottom-6 flex flex-col items-end gap-3 transition duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      <button
        type="button"
        onClick={toTop}
        aria-label={lang === 'EN' ? 'Back to top' : 'Volver arriba'}
        title={lang === 'EN' ? 'Back to top' : 'Volver arriba'}
        className="h-11 w-11 rounded-full bg-black/70 border border-white/15 text-white text-[18px] backdrop-blur grid place-items-center hover:bg-white hover:text-black transition"
      >
        ↑
      </button>
      {!bookingVisible && (
        <a
          href={bookHref}
          className="h-12 px-6 rounded-full bg-[#C5A46A] text-black text-[12px] tracking-[0.2em] font-semibold flex items-center gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)] hover:brightness-110 transition"
        >
          {t.nav.book.toUpperCase()} →
        </a>
      )}
    </div>
  );
}
