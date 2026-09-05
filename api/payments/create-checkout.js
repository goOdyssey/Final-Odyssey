import { normalizeProvider } from './provider.js';
import { createStripeCheckout } from './stripe.js';
import { createPayPalOrder } from './paypal.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const provider = normalizeProvider(req.body?.provider);
    const payload = provider === 'stripe'
      ? await createStripeCheckout(req)
      : await createPayPalOrder(req);
    return res.status(200).json({ provider, ...payload });
  } catch (error) {
    const status = error.code === 'PROVIDER_NOT_CONFIGURED' ? 503 : 400;
    return res.status(status).json({ error: error.message, code: error.code || 'CHECKOUT_FAILED' });
  }
}
