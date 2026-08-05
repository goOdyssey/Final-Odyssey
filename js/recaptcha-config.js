// Get your keys from https://www.google.com/recaptcha/admin (choose reCAPTCHA v3).
// The SITE key is public and safe to ship in this file.
// The SECRET key is NOT used here - it lives only as the RECAPTCHA_SECRET_KEY
// secret on the "login-guard" Supabase Edge Function. Never put the secret key
// in any file that ships to the browser.
window.ODYSSEY_RECAPTCHA = {
  enabled: true,
  siteKey: 'YOUR_RECAPTCHA_V3_SITE_KEY'
};
