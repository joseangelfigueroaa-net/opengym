import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { googleConfig, pkce, authUrl, exchangeCode, checkClaims } from '../lib/google.js';

const CLIENT = 'cliente-prueba.apps.googleusercontent.com';
const NOW = Date.parse('2026-10-23T12:00:00Z');
const good = { iss: 'https://accounts.google.com', aud: CLIENT, exp: NOW / 1000 + 600, sub: '1234567890', nonce: 'n1', given_name: 'Ana' };

test('Google sign-in is off unless both secrets are configured', () => {
  assert.equal(googleConfig({}), null);
  assert.equal(googleConfig({ GOOGLE_CLIENT_ID: 'a' }), null);
  assert.deepEqual(googleConfig({ GOOGLE_CLIENT_ID: 'a', GOOGLE_CLIENT_SECRET: 'b' }), { id: 'a', secret: 'b' });
});

test('PKCE: the challenge is the SHA-256 of the verifier, and every pair is new', () => {
  const p = pkce();
  assert.equal(p.challenge, crypto.createHash('sha256').update(p.verifier).digest('base64url'));
  assert.notEqual(pkce().verifier, p.verifier);
});

test('the authorization address asks for openid and profile with PKCE and our state and nonce', () => {
  const u = new URL(authUrl({ clientId: CLIENT, redirectUri: 'https://trainnery.com/api/auth/google/callback', state: 's1', challenge: 'c1', nonce: 'n1' }));
  assert.equal(u.origin + u.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(u.searchParams.get('scope'), 'openid profile');
  assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(u.searchParams.get('state'), 's1');
  assert.equal(u.searchParams.get('nonce'), 'n1');
});

test('a token is ours only with our client, Google as issuer, the nonce we sent, and not expired', () => {
  assert.equal(checkClaims(good, { clientId: CLIENT, nonce: 'n1', now: NOW }).sub, '1234567890');
  assert.throws(() => checkClaims({ ...good, iss: 'https://evil.example' }, { clientId: CLIENT, nonce: 'n1', now: NOW }), /issuer/);
  assert.throws(() => checkClaims({ ...good, aud: 'otro' }, { clientId: CLIENT, nonce: 'n1', now: NOW }), /audience/);
  assert.throws(() => checkClaims({ ...good, exp: NOW / 1000 - 1 }, { clientId: CLIENT, nonce: 'n1', now: NOW }), /expired/);
  assert.throws(() => checkClaims(good, { clientId: CLIENT, nonce: 'otro', now: NOW }), /nonce/);
  assert.throws(() => checkClaims({ ...good, sub: '' }, { clientId: CLIENT, nonce: 'n1', now: NOW }), /subject/);
});

test('the code exchange sends the verifier and reads the ID token from Google\'s answer', async () => {
  const payload = Buffer.from(JSON.stringify(good)).toString('base64url');
  let sent;
  const fetchImpl = async (url, opts) => { sent = { url, body: opts.body.toString() }; return { ok: true, json: async () => ({ id_token: 'x.' + payload + '.y' }) }; };
  const claims = await exchangeCode({ clientId: CLIENT, secret: 's', redirectUri: 'https://trainnery.com/api/auth/google/callback', code: 'abc', verifier: 'v1', fetchImpl });
  assert.equal(claims.sub, '1234567890');
  assert.equal(sent.url, 'https://oauth2.googleapis.com/token');
  const form = new URLSearchParams(sent.body);
  assert.equal(form.get('code_verifier'), 'v1');
  assert.equal(form.get('client_secret'), 's');
  assert.equal(form.get('grant_type'), 'authorization_code');
});

test('a refused code exchange is an error, never a sign-in', async () => {
  await assert.rejects(exchangeCode({ clientId: CLIENT, secret: 's', redirectUri: 'r', code: 'bad', verifier: 'v', fetchImpl: async () => ({ ok: false, status: 400 }) }), /400/);
});
