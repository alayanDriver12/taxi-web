// Envía la solicitud de reserva. Devuelve { id } o lanza un Error con el mensaje del servidor.
export async function sendBooking(data, url = '/api/bookings') {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || '');
  return body;
}
