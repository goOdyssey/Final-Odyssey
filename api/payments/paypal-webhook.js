/*
 PayPal webhook foundation.
 Production integration must verify the event with PayPal using the raw received
 headers/body and PAYPAL_WEBHOOK_ID, deduplicate by event ID, then fulfill only
 verified PAYMENT.CAPTURE.COMPLETED events.
*/
export default async function handler(req,res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.PAYPAL_WEBHOOK_ID) return res.status(503).json({error:'PayPal webhook not configured'});
  return res.status(501).json({error:'PayPal webhook verification adapter not connected'});
}
