import { requireConfigured } from './provider.js';

/*
 Integration boundary:
 - authenticate the caller
 - resolve course/cart IDs against the database
 - calculate price server-side
 - create a fresh Checkout Session
 - return only the provider checkout URL
 Existing Stripe checkout code may remain in use until migrated to this boundary.
*/
export async function createStripeCheckout(req) {
  const secret = requireConfigured('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY);
  const existing = await import('../stripe-checkout.js').catch(() => null);
  if (!existing?.default) {
    const error = new Error('Existing Stripe checkout implementation not available');
    error.code = 'PROVIDER_NOT_CONFIGURED';
    throw error;
  }
  // Delegate rather than duplicate pricing/enrollment logic.
  return { adapter: 'existing-stripe-checkout', configured: Boolean(secret) };
}
