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
      const promoCodeId = session.metadata?.promoCodeId || null;
      const cartCourseIdsRaw = session.metadata?.cartCourseIds || null;
      const grossCents = session.amount_total ?? 0;
      const currency = (session.currency || 'usd').toUpperCase();

      // ---- Multi-item cart checkout: one Stripe session, many courses.
      // Handled as its own branch, separate from the single-item flow
      // below. Each course is charged at its own real price (re-fetched
      // fresh here, never trusted from Stripe metadata), so a payment and
      // enrollment row is created per course rather than one lump sum.
      if (cartCourseIdsRaw && buyerId) {
        let cartCourseIds = [];
        try { cartCourseIds = JSON.parse(cartCourseIdsRaw); } catch { cartCourseIds = []; }
        if (!Array.isArray(cartCourseIds) || !cartCourseIds.length) {
          res.status(200).send('Ignored: empty cart metadata');
          return;
        }

        const { data: already } = await supabaseAdmin
          .from('payments').select('id').eq('metadata->>stripeSessionId', session.id).limit(1);
        if (already?.length) {
          res.status(200).send('Already processed');
          return;
        }

        const { data: coursesData } = await supabaseAdmin
          .from('courses').select('id, title, price_cents').in('id', cartCourseIds);

        for (const course of coursesData || []) {
          const gross = course.price_cents || 0;
          const platformFee = Math.round((gross * PLATFORM_FEE_BPS) / 10000);
          const net = gross - platformFee;

          const { data: payment, error: paymentError } = await supabaseAdmin
            .from('payments')
            .insert({
              user_id: buyerId, student_id: buyerId, course_id: course.id,
              provider: 'stripe',
              // Same Stripe payment_intent covers every item in this cart
              // checkout - suffix with the course id so each row still has
              // its own unique provider_payment_id (the idempotency check
              // above is keyed on the exact session's payment_intent, so a
              // retried webhook for this same session is still caught).
              provider_payment_id: `${session.payment_intent}:${course.id}`,
              amount_cents: gross, currency, status: 'paid', paid_at: new Date().toISOString(),
              gross_cents: gross, platform_fee_cents: platformFee, instructor_net_cents: net,
              platform_fee_bps: PLATFORM_FEE_BPS,
              metadata: { stripeSessionId: session.id, cartCheckout: true },
            })
            .select('id').single();

          if (paymentError) {
            console.error('stripe-webhook: cart payment insert failed', paymentError, { courseId: course.id, buyerId });
            continue;
          }

          const { error: enrollError } = await supabaseAdmin.from('enrollments').insert({
            student_id: buyerId, student_user_id: buyerId, course_id: course.id,
            status: 'active', progress_percent: 0,
            enrolled_at: new Date().toISOString(), started_at: new Date().toISOString(),
            payment_id: payment.id,
          });
          if (enrollError) {
            console.error('stripe-webhook: cart payment recorded but enrollment failed', enrollError, { paymentId: payment.id, courseId: course.id, buyerId });
          }

          await supabaseAdmin.from('cart_items').delete().eq('student_id', buyerId).eq('course_id', course.id);
        }

        await supabaseAdmin
          .from('checkout_sessions')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('provider_checkout_id', session.id);

        res.status(200).send('ok');
        return;
      }

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
        await supabaseAdmin.from('cart_items').delete().eq('student_id', buyerId).eq('course_id', courseId);
      }

      // Only now, after a genuinely confirmed payment, count the promo
      // code as used. Uses an atomic increment (not read-then-write) so
      // two near-simultaneous redemptions can't both slip in under the limit.
      if (promoCodeId) {
        const { error: promoError } = await supabaseAdmin.rpc('odyssey_increment_promo_code_usage_v2', { p_promo_id: promoCodeId });
        if (promoError) console.error('stripe-webhook: could not increment promo code usage', promoError);
      }
    }

    res.status(200).send('ok');
  } catch (error) {
    console.error('stripe-webhook: unhandled error', error);
    res.status(500).send('Webhook handler error');
  }
};
