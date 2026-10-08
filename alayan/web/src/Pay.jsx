// Página /pago/<token>: el cliente revisa su reserva y paga con SumUp.
// Al volver de SumUp (?vuelta=1) se consulta el estado unos segundos hasta confirmar el pago.
import { useEffect, useState } from 'react';
import { fill, withLang } from './util.js';

export const payTokenFromPath = () => location.pathname.match(/^\/pago\/([A-Za-z0-9_-]{32})\/?$/)?.[1] || null;

const POLL_MS = 2500;
const POLL_MAX = 12; // ~30 s

export default function Pay({ token, t, lang, waBase }) {
  const p = t.payment;
  const locale = lang === 'EN' ? 'en-GB' : 'es-ES';
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [checking, setChecking] = useState(() => new URLSearchParams(location.search).has('vuelta'));
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Carga inicial y, si vuelve de SumUp, sondeo hasta que el pago deje de estar en curso
  useEffect(() => {
    let alive = true, tries = 0, timer;
    async function load() {
      const r = await fetch(`/api/pay/${token}`).catch(() => null);
      if (!alive) return;
      if (!r || r.status === 404) { setNotFound(true); return setChecking(false); }
      const d = await r.json();
      setData(d);
      if (checking && d.state === 'ready' && d.processing && ++tries < POLL_MAX) timer = setTimeout(load, POLL_MS);
      else {
        setChecking(false);
        if (location.search.includes('vuelta')) history.replaceState(null, '', location.pathname + (lang === 'EN' ? '?lang=en' : ''));
      }
    }
    load();
    return () => { alive = false; clearTimeout(timer); };
  }, [token]);

  async function pay() {
    setError('');
    if (!accepted) return setError(t.booking.mustAccept);
    setBusy(true);
    try {
      const r = await fetch(`/api/pay/${token}/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accept: true })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.code === 'unavailable' ? p.unavailable : d.error || p.unavailable);
      location.href = d.url;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  const money = n => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(n);
  const longDate = d => new Date(`${d}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  let body;
  if (notFound) body = <Message text={p.notFound} />;
  else if (!data || checking) body = <Message text={checking ? p.checking : '…'} spinner />;
  else {
    const message = { no_price: p.noPrice, cancelled: p.cancelled, past: p.past }[data.state];
    body = (
      <>
        <p className="text-[#C5A46A] text-[13px] tracking-[0.2em]">{fill(p.hello, { name: data.firstName }).toUpperCase()}</p>
        <h1 className="serif text-[44px] md:text-[56px] leading-[0.95] mt-3">{data.state === 'paid' ? p.paidTitle : p.title}</h1>
        {data.state === 'paid'
          ? <p className="mt-4 text-white/70 text-[16px] leading-relaxed">{fill(p.paidText, { id: data.id })}</p>
          : <p className="mt-4 text-white/60">{p.subtitle}</p>}

        <dl className="mt-10 rounded-[24px] bg-white/[0.04] border border-white/10 divide-y divide-white/10">
          <Row label={p.route} value={<>{data.origin}<span className="text-[#C5A46A]"> → </span>{data.destination}</>} />
          <Row label={p.when} value={<span className="first-letter:uppercase inline-block">{longDate(data.date)} · {data.time}</span>} />
          <Row label={p.pax} value={data.pax} />
          <Row label={p.luggage} value={data.luggage} />
          {data.flight && <Row label={p.flight} value={data.flight} />}
          {data.amount > 0 && <Row label={p.total} value={<span className="serif text-[30px] text-white">{money(data.amount)}</span>} />}
        </dl>

        {message && <p className="mt-8 rounded-[16px] border border-white/10 bg-white/[0.04] p-4 text-white/80">{message}</p>}

        {(data.state === 'ready' || data.state === 'failed') && (
          <div className="mt-8">
            {data.state === 'failed' && <p className="mb-5 rounded-[16px] border border-[#b94a4a]/40 bg-[#6b2222]/30 p-4 text-[14px]">{p.failed}</p>}
            <label className="flex gap-3 items-start text-[13px] leading-relaxed text-white/70 cursor-pointer">
              <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#C5A46A]" />
              <span>
                {p.acceptPrefix}{' '}
                <a href={withLang('/condiciones', lang)} target="_blank" className="underline text-white hover:text-[#C5A46A]">{t.footer.legal.terms.toLowerCase()}</a>
                {' '}({t.booking.cancel})
              </span>
            </label>
            {error && <p className="mt-4 text-[14px] text-[#ff9a9a]" role="alert">{error}</p>}
            <button
              onClick={pay}
              disabled={busy}
              className="mt-6 w-full h-14 rounded-full bg-[#C5A46A] text-black text-[13px] tracking-[0.18em] font-semibold hover:brightness-110 transition disabled:opacity-60"
            >
              {busy ? p.redirecting.toUpperCase() : fill(p.pay, { amount: money(data.amount) }).toUpperCase()}
            </button>
            <p className="mt-4 text-center text-[12px] text-white/40">{t.booking.secure}</p>
          </div>
        )}
      </>
    );
  }

  return (
    <main className="mx-auto max-w-[640px] px-6 py-16 md:py-24">
      {body}
      <a href={waBase} target="_blank" rel="noopener" className="mt-12 block text-center text-[13px] text-white/50 hover:text-white underline underline-offset-4">{p.help}</a>
    </main>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-6 px-6 py-4 items-baseline">
      <dt className="text-[11px] tracking-[0.18em] text-white/40 uppercase shrink-0">{label}</dt>
      <dd className="text-right text-[15px]">{value}</dd>
    </div>
  );
}

function Message({ text, spinner }) {
  return (
    <div className="py-16 text-center">
      {spinner && <div className="mx-auto mb-6 h-10 w-10 rounded-full border-2 border-white/15 border-t-[#C5A46A] animate-spin" />}
      <p className="text-white/70 text-[17px]">{text}</p>
    </div>
  );
}
