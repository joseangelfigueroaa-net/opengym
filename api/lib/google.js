/* Sign-in with Google (Trainnery): OpenID Connect, authorization code flow with PKCE.
 *
 * Configured by GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. Without them the feature is off and
 * nothing here is reachable. The redirect address registered at Google must be
 * <ORIGIN>/api/auth/google/callback.
 */
import crypto from 'node:crypto';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export const googleConfig = (env = process.env) =>
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? { id: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET } : null;

/** A fresh PKCE pair: the verifier stays on the server, only its hash goes to Google. */
export function pkce() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function authUrl({ clientId, redirectUri, state, challenge, nonce }) {
  const q = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid profile',
    state, nonce, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account'
  });
  return AUTH_URL + '?' + q.toString();
}

/** Trades the code for Google's ID token. The token comes straight from Google's token endpoint
 *  over TLS, authenticated with our client secret, so its claims are read here and checked by
 *  checkClaims (OpenID Connect Core 3.1.3.7 allows this without a signature check). */
export async function exchangeCode({ clientId, secret, redirectUri, code, verifier, fetchImpl = fetch }) {
  const r = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: secret, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: verifier }),
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error('token endpoint answered ' + r.status);
  const { id_token } = await r.json();
  const part = String(id_token || '').split('.')[1];
  if (!part) throw new Error('no id token');
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

/** The claims that make this token ours: the right issuer, for our app, not expired, and the nonce
 *  we sent. Returns the claims or throws with the reason. */
export function checkClaims(claims, { clientId, nonce, now = Date.now() }) {
  if (!ISSUERS.includes(claims.iss)) throw new Error('wrong issuer');
  if (claims.aud !== clientId) throw new Error('wrong audience');
  if (!(Number(claims.exp) * 1000 > now)) throw new Error('expired');
  if (claims.nonce !== nonce) throw new Error('nonce mismatch');
  if (typeof claims.sub !== 'string' || !claims.sub) throw new Error('no subject');
  return claims;
}
