import { requireConfigured, safeOrigin } from './provider.js';

const baseUrl = () => process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function accessToken() {
  const clientId = requireConfigured('PAYPAL_CLIENT_ID', process.env.PAYPAL_CLIENT_ID);
  const secret = requireConfigured('PAYPAL_CLIENT_SECRET', process.env.PAYPAL_CLIENT_SECRET);
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const response = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method:'POST',
    headers:{authorization:`Basic ${auth}`,'content-type':'application/x-www-form-urlencoded'},
    body:'grant_type=client_credentials'
  });
  if (!response.ok) throw new Error('PayPal authentication failed');
  return (await response.json()).access_token;
}

/*
 TODO for production developer:
 resolve req.body cart/course IDs from Supabase, calculate amount server-side,
 create an Orders v2 order, store a pending internal payment row, and return order id.
 Never trust amount, currency, or enrollment state supplied by the browser.
*/
export async function createPayPalOrder(req) {
  await accessToken();
  const origin = safeOrigin(req);
  const error = new Error(`PayPal foundation is configured but requires course/cart resolver integration before checkout. Origin: ${origin}`);
  error.code = 'PAYPAL_INTEGRATION_INCOMPLETE';
  throw error;
}
