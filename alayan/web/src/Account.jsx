// Página de reservas de un hotel o empresa: /empresa/<token> (enlace privado, sin registro).
// Reservan para sus clientes con el formulario normal; la reserva queda «a cuenta» y se cobra después.
import { useEffect, useState } from 'react';
import BookingForm from './BookingForm.jsx';
import { fill } from './util.js';

export const accountTokenFromPath = (pathname = location.pathname) => pathname.match(/^\/empresa\/([A-Za-z0-9_-]{16,64})\/?$/)?.[1] || null;

export default function Account({ token, content, t, lang, waBase }) {
  const [company, setCompany] = useState(null);
  const [failed, setFailed] = useState(false);
  const a = t.account;

  useEffect(() => {
    fetch(`/api/empresa/${token}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setCompany)
      .catch(() => setFailed(true));
  }, [token]);

  return (
    <main className="mx-auto max-w-[1100px] px-6 md:px-10 py-12 md:py-16">
      {failed ? (
        <div className="max-w-[560px] mx-auto text-center py-16">
          <p className="serif text-[28px] leading-tight">{a.invalid}</p>
          <a href={waBase} target="_blank" rel="noopener" className="mt-8 inline-flex h-12 px-6 items-center rounded-full bg-[#C5A46A] text-black text-[12px] tracking-[0.18em] font-semibold">WHATSAPP</a>
        </div>
      ) : !company ? (
        <p className="text-center text-white/50 py-20">{a.loading}</p>
      ) : (
        <div className="grid lg:grid-cols-[0.75fr_1.25fr] gap-10 items-start">
          <div>
            <div className="text-[11px] tracking-[0.35em] text-[#C5A46A]">{a.kicker}</div>
            <h1 className="serif mt-4 text-[40px] md:text-[54px] leading-[0.95]">{fill(a.title, { name: company.name })}</h1>
            <p className="mt-5 text-[15px] leading-relaxed text-white/60">{a.subtitle}</p>
            <div className="mt-8 rounded-[20px] bg-white/[0.04] border border-white/10 p-6">
              <ul className="grid gap-2 text-[13px] text-white/70">
                {t.booking.includes.map((item, i) => <li key={i}>✓ {item}</li>)}
              </ul>
            </div>
          </div>
          <div className="rounded-[28px] bg-[#F7F3ED] text-black p-6 md:p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
            <BookingForm t={t} p={content.pricing} lang={lang} waBase={waBase} owner={content.legal.owner} account={{ token, name: company.name }} />
          </div>
        </div>
      )}
    </main>
  );
}
