// /api/create-checkout-session.js
//
// Called by the client (learnworld_catalog.html) when a student clicks
// "Enroll" on a paid course. This is the ONLY place a Stripe Checkout
// Session gets created - the client never talks to Stripe directly, and
// never gets to decide the price. Everything here is re-verified
// server-side:
//   - who the buyer actually is (their Supabase session token, not a
//     client-supplied user id)
//   - what the course actually costs (fetched fresh from the database,
//     not trusted from the request body)
//   - whether the course is actually published and purchasable
//
// Required environment variables (set these in your Vercel project
// settings -> Environment Variables, never commit them to the repo):
//   STRIPE_SECRET_KEY            - from Stripe Dashboard -> Developers -> API keys
//   SUPABASE_URL                 - https://yxewqmemegiogqwyklai.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    - from Supabase Dashboard -> Project Settings -> API
//   PUBLIC_SITE_URL              - e.g. https://your-odyssey-domain.vercel.app
//                                   (used to build the success/cancel redirect URLs)

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const requiredEnv = ['STRIPE_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PUBLIC_SITE_URL'];
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length) {
    res.status(503).json({
      error: 'Payment processing is not configured yet on this deployment.',
      missingEnvVars: missing,
    });
    return;
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Identify the real, authenticated buyer from their Supabase access
    // token - never from anything the client claims in the request body.
    const authHeader = req.headers.authorization || '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!accessToken) {
      res.status(401).json({ error: 'You must be signed in to purchase a course.' });
      return;
    }
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      res.status(401).json({ error: 'Your session could not be verified. Please sign in again.' });
      return;
    }
    const buyerId = userData.user.id;

    // 2. Figure out what's being purchased. Supports a course purchase or
    // an exam purchase (exam_portal.html can reuse this same endpoint
    // later) - exactly one of the two must be provided.
    const { courseId, examId } = req.body || {};
    if ((!courseId && !examId) || (courseId && examId)) {
      res.status(400).json({ error: 'Provide exactly one of courseId or examId.' });
      return;
    }

    let itemTable = courseId ? 'courses' : 'exams';
    let itemId = courseId || examId;
    const { data: item, error: itemError } = await supabaseAdmin
      .from(itemTable)
      .select('id, title, price_cents, currency, status, instructor_id')
      .eq('id', itemId)
      .maybeSingle();

    if (itemError || !item) {
      res.status(404).json({ error: 'That course or exam could not be found.' });
      return;
    }
    if (item.status !== 'published') {
      res.status(400).json({ error: 'This item is not currently available for purchase.' });
      return;
    }
    if (!item.price_cents || item.price_cents <= 0) {
      res.status(400).json({ error: 'This item is free - use the free enrollment path instead of checkout.' });
      return;
    }

    // 3. Prevent duplicate purchases: if the buyer already has a paid
    // payment for this exact item, don't make them pay again.
    const dupCheckColumn = courseId ? 'course_id' : 'exam_id';
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq(dupCheckColumn, itemId)
      .eq('status', 'paid')
      .or(`user_id.eq.${buyerId},student_id.eq.${buyerId}`)
      .maybeSingle();
    if (existingPayment) {
      res.status(409).json({ error: 'You already own this item.', alreadyOwned: true });
      return;
    }

    // 4. Create the real Stripe Checkout Session. Stripe hosts the actual
    // payment page - card details never touch this server or the client.
    const currency = (item.currency || 'usd').toLowerCase();
    const successUrl = `${process.env.PUBLIC_SITE_URL}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.PUBLIC_SITE_URL}/checkout-cancel.html`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: item.price_cents,
            product_data: { name: item.title },
          },
          quantity: 1,
        },
      ],
      customer_email: userData.user.email || undefined,
      metadata: {
        buyerId,
        courseId: courseId || '',
        examId: examId || '',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 30, // 30 minutes
    });

    // 5. Record the checkout attempt in our own database too, so we have
    // a record even before the webhook fires. Note: checkout_sessions was
    // only ever built to track COURSE checkouts (course_id is NOT NULL on
    // that table, and there's no exam_id column at all) - for an exam
    // purchase we skip this and rely on the Stripe session + the payments
    // row the webhook creates instead.
    if (courseId) {
      await supabaseAdmin.from('checkout_sessions').insert({
        user_id: buyerId,
        course_id: courseId,
        provider: 'stripe',
        mode: 'payment',
        amount_cents: item.price_cents,
        currency: currency.toUpperCase(),
        status: 'open',
        provider_checkout_id: session.id,
        checkout_url: session.url,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { itemTitle: item.title },
        expires_at: new Date(session.expires_at * 1000).toISOString(),
      });
    }

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('create-checkout-session error:', error);
    res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
};
