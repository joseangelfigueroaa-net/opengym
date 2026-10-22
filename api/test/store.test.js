import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../lib/store.js';
import { createLimiter, clientIp, crossSiteWrite } from '../lib/security.js';

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'store-'));

/* ---------------- store ---------------- */

test('a write is readable at once and on disk after flush', async () => {
  const dir = tmpDir(), s = createStore({ dir });
  s.write('a.json', { n: 1 });
  assert.deepEqual(s.read('a.json'), { n: 1 });
  await s.flush();
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'a.json'), 'utf8')), { n: 1 });
});

test('writes piling up on one file end with the latest content, and leave no temp files', async () => {
  const dir = tmpDir(), s = createStore({ dir });
  for (let n = 1; n <= 50; n++) s.write('a.json', { n });
  await s.flush();
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'a.json'), 'utf8')), { n: 50 });
  assert.deepEqual(fs.readdirSync(dir), ['a.json']);
});

test('a missing or broken file reads as the fallback, and is not cached', () => {
  const dir = tmpDir(), s = createStore({ dir });
  fs.writeFileSync(path.join(dir, 'bad.json'), '{oops');
  assert.equal(s.read('nope.json', null), null);
  assert.deepEqual(s.read('bad.json'), {});
  assert.equal(s.stats().cached, 0);
});

test('the cache is bounded and keeps the most recently used files', () => {
  const dir = tmpDir(), s = createStore({ dir, maxEntries: 2 });
  for (const n of ['a', 'b', 'c']) fs.writeFileSync(path.join(dir, n + '.json'), JSON.stringify({ n }));
  s.read('a.json'); s.read('b.json'); s.read('a.json'); s.read('c.json');   // b is the oldest now
  assert.equal(s.stats().cached, 2);
  fs.writeFileSync(path.join(dir, 'a.json'), '{"n":"changed"}');
  assert.deepEqual(s.read('a.json'), { n: 'a' }, 'a stayed cached');
});

test('remove drops the file from cache and disk', async () => {
  const dir = tmpDir(), s = createStore({ dir });
  s.write('a.json', { n: 1 });
  await s.remove('a.json');
  assert.equal(s.read('a.json', null), null);
  assert.equal(fs.existsSync(path.join(dir, 'a.json')), false);
});

/* ---------------- security ---------------- */

test('the limiter allows up to the limit per key and window, then says how long to wait', () => {
  const l = createLimiter({ limit: 3, windowMs: 60000 });
  const t0 = 1_000_000;
  assert.deepEqual([1, 2, 3].map(() => l.take('ip1', t0)), [0, 0, 0]);
  assert.equal(l.take('ip1', t0 + 10000), 50);
  assert.equal(l.take('ip2', t0 + 10000), 0, 'other visitors are not affected');
  assert.equal(l.take('ip1', t0 + 60000), 0, 'a new window starts fresh');
});

test('the visitor address comes from Cloudflare, then the proxy chain', () => {
  const req = h => ({ headers: h, socket: { remoteAddress: '10.0.0.2' } });
  assert.equal(clientIp(req({ 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' })), '1.2.3.4');
  assert.equal(clientIp(req({ 'x-forwarded-for': '5.6.7.8, 10.0.0.1' })), '5.6.7.8');
  assert.equal(clientIp(req({})), '10.0.0.2');
});

test('writes from another site are refused; reads and same-site writes are not', () => {
  const O = 'https://trainnery.com';
  assert.equal(crossSiteWrite({ method: 'POST', headers: { origin: 'https://evil.example' } }, O), true);
  assert.equal(crossSiteWrite({ method: 'POST', headers: { origin: O } }, O), false);
  assert.equal(crossSiteWrite({ method: 'POST', headers: {} }, O), false);
  assert.equal(crossSiteWrite({ method: 'GET', headers: { origin: 'https://evil.example' } }, O), false);
});
