import { createClient } from 'jsr:@supabase/supabase-js@2';

// verify_jwt is intentionally OFF: this function has to run BEFORE a session
// exists (pre-login gate, pre-signup gate), so there is no user JWT to check yet.
// It never returns account data, only allow/deny + a generic reason string, and
// every write goes through the service-role client below, not the caller's key.

const RECAPTCHA_SECRET = Deno.env.get('RECAPTCHA_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ALLOW_CAPTCHA_BYPASS = Deno.env.get('ODYSSEY_ALLOW_CAPTCHA_BYPASS') === 'true';

// Minimum acceptable reCAPTCHA v3 score (0.0 = certainly a bot, 1.0 = certainly human).
const MIN_SCORE: Record<string, number> = {
  login: 0.4,
  signup: 0.4,
  admin_login: 0.6,
  founder_login: 0.7,
};

const MAX_FAILURES_PER_WINDOW = 6;
const WINDOW_MINUTES = 15;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function verifyRecaptcha(token: string, ip: string) {
  if (!RECAPTCHA_SECRET) {
    if (ALLOW_CAPTCHA_BYPASS) {
      console.warn('reCAPTCHA bypass enabled explicitly for a non-production environment.');
      return { ok: true, score: null };
    }
    console.error('RECAPTCHA_SECRET_KEY is not configured.');
    return { ok: false, score: null, reason: 'captcha_unavailable' };
  }
  if (!token) {
    if (ALLOW_CAPTCHA_BYPASS) return { ok: true, score: null };
    console.warn('reCAPTCHA token missing.');
    return { ok: false, score: null, reason: 'captcha_required' };
  }
  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: RECAPTCHA_SECRET, response: token, remoteip: ip }),
    });
    const data = await res.json();
    return { ok: !!data.success, score: typeof data.score === 'number' ? data.score : null };
  } catch (err) {
    console.error('reCAPTCHA verification request failed:', err);
    if (ALLOW_CAPTCHA_BYPASS) return { ok: true, score: null };
    return { ok: false, score: null, reason: 'captcha_unavailable' };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ allowed: true, reason: 'not_configured' });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const step = body.step;
  const email = String(body.email || '').trim().toLowerCase();
  const action = MIN_SCORE[body.action] ? body.action : 'login';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const userAgent = req.headers.get('user-agent') || '';
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (step === 'check') {
    const { ok, score } = await verifyRecaptcha(body.recaptchaToken, ip);
    if (!ok || (score !== null && score < MIN_SCORE[action])) {
      return json({ allowed: false, reason: 'recaptcha_failed' });
    }

    if (action === 'login' || action === 'admin_login' || action === 'founder_login') {
      const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
      const { count, error } = await sb
        .from('login_security_events')
        .select('id', { count: 'exact', head: true })
        .eq('email', email)
        .eq('outcome', 'failure')
        .gte('created_at', since);
      if (!error && (count || 0) >= MAX_FAILURES_PER_WINDOW) {
        return json({ allowed: false, reason: 'too_many_attempts' });
      }
    }

    return json({ allowed: true });
  }

  if (step === 'record') {
    const outcome = body.outcome === 'success' ? 'success' : 'failure';
    const { error } = await sb.from('login_security_events').insert({
      email: email || null,
      ip_address: ip,
      user_agent: userAgent,
      outcome,
    });
    if (error) console.error('Failed to record login_security_events row:', error);
    return json({ ok: true });
  }

  return json({ error: 'Unknown step' }, 400);
});
