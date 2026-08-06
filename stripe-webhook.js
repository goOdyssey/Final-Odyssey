// /api/stripe-webhook.js
//
// Stripe calls this URL directly (server-to-server) when a checkout
// session completes - never the browser. This is the ONLY code path in
// the entire app that is allowed to mark a payment "paid" and create the
// resulting enrollment/exam-access record. Nothing client-side can do
// this, by design (see the RLS policies on payments/enrollments).
//
// Setup, once you have a Stripe account:
//   1. Stripe Dashboard -> Developers -> Webhooks -> Add endpoint
//      URL: https://<your-domain>/api/stripe-webhook
//      Event to send: checkout.session.completed
//   2. Copy the "Signing secret" Stripe shows you into Vercel as
//      STRIPE_WEBHOOK_SECRET (Project Settings -> Environment Variables).
//   3. Also set STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//      (same values used by create-checkout-session.js).
//
// IMPORTANT: Stripe signature verification requires the exact raw request
// body, so automatic body parsing is disabled below - do not remove the
// `config` export or this will stop working.

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports.config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Platform take rate. Matches the 70/30 split described on earnings.html -
// change this in one place if that ever changes.
const PLATFORM_FEE_BPS = 3000; // 30.00%

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const requiredEnv = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error('stripe-webhook: missing env vars', missing);
    res.status(503).send('Webhook not configured');
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    // Signature didn't match - this request did not genuinely come from
    // Stripe. Reject it outright rather than trusting the payload.
    console.error('stripe-webhook: signature verification failed', error.message);
    res.status(400).send(`Webhook signature verification failed`);
    return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const buyerId = session.metadata?.buyerId;
      const courseId = session.metadata?.courseId || null;
      const examId = session.metadata?.examId || null;
      const grossCents = session.amount_total ?? 0;
      const currency = (session.currency || 'usd').toUpperCase();

      if (!buyerId || (!courseId && !examId)) {
        console.error('stripe-webhook: missing metadata on session', session.id);
        res.status(200).send('Ignored: missing metadata');
        return;
      }

      // Idempotency: Stripe may deliver the same event more than once.
      // If we already recorded this exact Stripe payment, do nothing further.
      const { data: already } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('provider_payment_id', session.payment_intent)
        .maybeSingle();
      if (already) {
        res.status(200).send('Already processed');
        return;
      }

      const platformFeeCents = Math.round((grossCents * PLATFORM_FEE_BPS) / 10000);
      const instructorNetCents = grossCents - platformFeeCents;

      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('payments')
        .insert({
          user_id: buyerId,
          student_id: buyerId,
          course_id: courseId,
          exam_id: examId,
          provider: 'stripe',
          provider_payment_id: session.payment_intent,
          amount_cents: grossCents,
          currency,
          status: 'paid',
          paid_at: new Date().toISOString(),
          gross_cents: grossCents,
          platform_fee_cents: platformFeeCents,
          instructor_net_cents: instructorNetCents,
          platform_fee_bps: PLATFORM_FEE_BPS,
          metadata: { stripeSessionId: session.id },
        })
        .select('id')
        .single();

      if (paymentError) {
        console.error('stripe-webhook: could not insert payment', paymentError);
        res.status(500).send('Could not record payment');
        return;
      }

      // Mark the matching checkout_sessions row completed, if one exists
      // (course purchases only - see the note in create-checkout-session.js).
      if (courseId) {
        await supabaseAdmin
          .from('checkout_sessions')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('provider_checkout_id', session.id);
      }

      // Course purchase -> create the real enrollment now that payment is
      // genuinely confirmed. (Exam purchases don't need an enrollment row -
      // start_exam_attempt() already checks the payments table directly.)
      if (courseId) {
        const { error: enrollError } = await supabaseAdmin.from('enrollments').insert({
          student_id: buyerId,
          student_user_id: buyerId,
          course_id: courseId,
          status: 'active',
          progress_percent: 0,
          enrolled_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          payment_id: payment.id,
        });
        if (enrollError) {
          // Payment is already recorded and genuinely successful at this
          // point - log loudly so this can be caught and fixed manually,
          // but don't tell Stripe to retry (that would risk a duplicate
          // charge-adjacent side effect, not a duplicate charge itself).
          console.error('stripe-webhook: payment recorded but enrollment failed', enrollError, { paymentId: payment.id, courseId, buyerId });
        }
      }
    }

    res.status(200).send('ok');
  } catch (error) {
    console.error('stripe-webhook: unhandled error', error);
    res.status(500).send('Webhook handler error');
  }
};
