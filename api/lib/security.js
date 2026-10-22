/* Request-level guards for the API (Trainnery): who is asking, how often, and from where.
 *
 * Trainnery runs behind Cloudflare and Coolify's Traefik, then the web container's nginx, so the
 * socket address is a proxy's. Cloudflare's CF-Connecting-IP is the visitor; X-Forwarded-For's
 * first hop is the fallback. Both can be forged by someone who reaches the server without going
 * through Cloudflare: they could then pick a fresh bucket per request, or spend someone else's.
 * That is closed at the edge, not here — the origin must only accept Cloudflare (host firewall
 * on Cloudflare's ranges, or Authenticated Origin Pulls). What this file does guarantee is that
 * rotating keys cannot grow memory without bound (MAX_KEYS).
 */
const MAX_KEYS = 50000;

export function clientIp(req) {
  const cf = req.headers['cf-connecting-ip'];
  if (cf) return String(cf).trim();
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown');
}

/** Fixed-window counter per key. `take` answers 0 when allowed, else the seconds to wait. */
export function createLimiter({ limit, windowMs }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, h] of hits) if (now - h.start >= windowMs) hits.delete(k);
  }, windowMs).unref();
  return {
    take(key, now = Date.now()) {
      let h = hits.get(key);
      if (!h || now - h.start >= windowMs) {
        h = { start: now, n: 0 };
        hits.delete(key);
        // a full table drops its oldest window (Maps iterate in insertion order)
        if (hits.size >= MAX_KEYS) hits.delete(hits.keys().next().value);
        hits.set(key, h);
      }
      h.n++;
      return h.n <= limit ? 0 : Math.max(1, Math.ceil((h.start + windowMs - now) / 1000));
    }
  };
}

/** A state-changing request from another site is refused; same-site fetches send our Origin. */
export function crossSiteWrite(req, origin) {
  if (req.method === 'GET' || req.method === 'HEAD') return false;
  const o = req.headers.origin;
  return !!o && o !== origin;
}
