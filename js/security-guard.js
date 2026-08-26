(function () {
  function cfg() {
    return window.ODYSSEY_RECAPTCHA || {};
  }

  function isConfigured() {
    const c = cfg();
    return !!(c.enabled && c.siteKey && !String(c.siteKey).includes('YOUR_RECAPTCHA'));
  }

  function loadSdk() {
    if (window.grecaptcha) return Promise.resolve(window.grecaptcha);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-odyssey-recaptcha]');
      if (existing) {
        existing.addEventListener('load', () => window.grecaptcha.ready(() => resolve(window.grecaptcha)), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(cfg().siteKey)}`;
      script.dataset.odysseyRecaptcha = 'true';
      script.onload = () => window.grecaptcha.ready(() => resolve(window.grecaptcha));
      script.onerror = () => reject(new Error('reCAPTCHA could not be loaded.'));
      document.head.appendChild(script);
    });
  }

  async function getToken(action) {
    if (!isConfigured()) return null;
    try {
      const grecaptcha = await loadSdk();
      return await grecaptcha.execute(cfg().siteKey, { action });
    } catch (err) {
      console.warn('reCAPTCHA token fetch failed, continuing without one:', err);
      return null;
    }
  }

  function functionUrl() {
    const supaCfg = window.ODYSSEY_SUPABASE || {};
    if (!supaCfg.url) return null;
    return `${supaCfg.url.replace(/\/$/, '')}/functions/v1/login-guard`;
  }

  async function callGuard(payload) {
    const url = functionUrl();
    const supaCfg = window.ODYSSEY_SUPABASE || {};
    // If Supabase itself isn't configured yet, let the normal Supabase-not-connected
    // error surface elsewhere instead of blocking on the security layer.
    if (!url || !supaCfg.anonKey) return { allowed: true };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supaCfg.anonKey}`,
          apikey: supaCfg.anonKey
        },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      // An outage in this best-effort security layer should never itself lock
      // real users out - fail open, but the caller still gets normal Supabase
      // auth errors (wrong password etc.) from the actual sign-in call.
      console.warn('Security guard call failed, continuing without it:', err);
      return { allowed: true };
    }
  }

  function reasonMessage(reason) {
    if (reason === 'too_many_attempts') return 'Too many attempts for this account. Please wait a few minutes and try again.';
    if (reason === 'recaptcha_failed') return "We couldn't verify you're human. Please refresh the page and try again.";
    return 'Please try again.';
  }

  /** Call before attempting a login or signup. action: 'login' | 'signup' | 'admin_login' */
  async function check(email, action) {
    const token = await getToken(action);
    const result = await callGuard({ step: 'check', email, action, recaptchaToken: token });
    if (!result.allowed) result.message = reasonMessage(result.reason);
    return result;
  }

  /** Call after a login attempt resolves, to feed the lockout counter. */
  function record(email, outcome) {
    // Fire-and-forget - never block the UI on this.
    callGuard({ step: 'record', email, outcome }).catch(() => {});
  }

  window.OdysseySecurity = { isConfigured, check, record };
})();
