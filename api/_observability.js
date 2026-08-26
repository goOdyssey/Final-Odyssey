export function requestId(req) {
  const existing = req.headers?.['x-request-id'];
  return typeof existing === 'string' && existing.length <= 128
    ? existing
    : crypto.randomUUID();
}

export function logEvent(level, event, context = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(context || {})) {
    if (/password|secret|token|authorization|cookie/i.test(key)) continue;
    safe[key] = value;
  }
  console[level](`[odyssey] ${JSON.stringify({ ts: new Date().toISOString(), event, ...safe })}`);
}
