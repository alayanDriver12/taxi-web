// Cliente mínimo de la API de SumUp (Hosted Checkout) y modo simulación para desarrollo.
// Docs: https://developer.sumup.com/online-payments/checkouts/hosted-checkout
// Ojo: una sesión de Hosted Checkout caduca a los 30 minutos; por eso se crea cuando el cliente pulsa «Pagar».
const crypto = require('node:crypto');

const API = 'https://api.sumup.com/v0.1';

function createSumUp({ apiKey, merchantCode, mock, baseUrl }) {
  if (apiKey && merchantCode) return realClient(apiKey, merchantCode);
  if (mock) return mockClient(baseUrl);
  return { mode: 'off' };
}

function realClient(apiKey, merchantCode) {
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  return {
    mode: 'real',
    async createCheckout({ reference, amount, description, redirectUrl, webhookUrl }) {
      const r = await fetch(`${API}/checkouts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          checkout_reference: reference,
          amount, currency: 'EUR',
          merchant_code: merchantCode,
          description,
          redirect_url: redirectUrl, // en la página de éxito de SumUp aparece un botón para volver aquí
          return_url: webhookUrl,    // SumUp avisa aquí de los cambios de estado
          hosted_checkout: { enabled: true }
        })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`SumUp ${r.status}: ${data.message || data.error_code || JSON.stringify(data)}`);
      return { id: data.id, url: data.hosted_checkout_url };
    },
    async getCheckout(id) {
      const r = await fetch(`${API}/checkouts/${encodeURIComponent(id)}`, { headers });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`SumUp ${r.status}: ${data.message || JSON.stringify(data)}`);
      return {
        status: data.status, // PENDING | PAID | FAILED | EXPIRED
        amount: data.amount,
        transactionCode: data.transaction_code || data.transactions?.[0]?.transaction_code || null
      };
    }
  };
}

// Simula SumUp sin cuenta: el «checkout» es una página local con botones de pago correcto / fallido.
// Solo para desarrollo y staging; nunca cobra nada.
function mockClient(baseUrl) {
  const checkouts = new Map();
  return {
    mode: 'mock',
    checkouts,
    async createCheckout({ amount, description, redirectUrl, webhookUrl }) {
      const id = 'sim_' + crypto.randomBytes(9).toString('hex');
      checkouts.set(id, { status: 'PENDING', amount, description, redirectUrl, webhookUrl, created: Date.now() });
      return { id, url: `${baseUrl}/sumup-simulado/${id}` };
    },
    async getCheckout(id) {
      const c = checkouts.get(id);
      if (!c) return { status: 'EXPIRED', amount: null, transactionCode: null }; // p. ej. tras reiniciar el servidor
      if (c.status === 'PENDING' && Date.now() - c.created > 30 * 60 * 1000) c.status = 'EXPIRED';
      return { status: c.status, amount: c.amount, transactionCode: c.status === 'PAID' ? 'SIM-' + id.slice(4, 12).toUpperCase() : null };
    }
  };
}

module.exports = { createSumUp };
