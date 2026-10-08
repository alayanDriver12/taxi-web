// Envía la reserva al backend y redirige al checkout de SumUp
export async function submitBooking(f, mustAcceptMsg) {
  const need = ['name', 'phone', 'email', 'origin', 'destination', 'date', 'time'];
  const missing = need.filter(k => !String(f[k] || '').trim());
  if (missing.length) return alert('Por favor completa los campos obligatorios (*).');
  if (!f.privacy) return alert(mustAcceptMsg);
  try {
    const r = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f)
    });
    const data = await r.json();
    if (!r.ok) return alert(data.error || 'No se pudo crear la reserva.');
    if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    else alert('Reserva #' + data.id + ' recibida. Te contactaremos para confirmar el pago.');
  } catch (e) { alert('Error de conexión. Inténtalo de nuevo o escríbenos por WhatsApp.'); }
}
