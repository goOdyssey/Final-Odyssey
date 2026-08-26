export function normalizeProvider(value) {
  const provider = String(value || '').toLowerCase();
  if (!['stripe', 'paypal'].includes(provider)) {
    throw new Error('Unsupported payment provider');
  }
  return provider;
}

export function requireConfigured(name, value) {
  if (!value) {
    const error = new Error(`${name} is not configured`);
    error.code = 'PROVIDER_NOT_CONFIGURED';
    throw error;
  }
  return value;
}

export function safeOrigin(req) {
  const origin = req.headers?.origin;
  const configured = process.env.PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (origin && /^https:\/\//.test(origin)) return origin.replace(/\/$/, '');
  throw new Error('PUBLIC_APP_URL is required');
}
