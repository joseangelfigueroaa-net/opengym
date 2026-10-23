/* Security suite (Trainnery): starts the real API on a throwaway DATA_DIR with seeded accounts
 * and attacks it — authentication, who may read whom, injection and traversal, uploads, request
 * hygiene, rate limits, plan gating. Every check here is a hole that once existed somewhere or
 * would be easy to open by accident.
 *
 * Accounts: admin; t1 (Silver) with client c1; t2 (Free) with client c2; x, a signed-up user
 * with no trainer — the intruder.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'sec-'));
const SECRET = 'd'.repeat(64);
const PORT = 3900 + Math.floor(Math.random() * 90);
const ORIGIN = 'http://localhost:' + PORT;
const BASE = 'http://127.0.0.1:' + PORT;
const NOW = new Date().toISOString();

/* ---------------- seed ---------------- */
fs.writeFileSync(path.join(DATA, 'secret'), SECRET);
fs.writeFileSync(path.join(DATA, 'db.json'), JSON.stringify({
  users: [
    { id: 'admin', name: 'Admin', created: NOW },
    { id: 't1', name: 'Trainer One', created: NOW, trainer: { plan: 'silver', since: NOW } },
    { id: 't2', name: 'Trainer Two', created: NOW, trainer: { plan: 'free', since: NOW } },
    { id: 'c1', name: 'Client One', created: NOW },
    { id: 'c2', name: 'Client Two', created: NOW },
    { id: 'x', name: 'Intruder', created: NOW },
    // audit regressions: t3 took over c4 from a former trainer; c3 synced a malformed state;
    // y is disabled during the run
    { id: 't3', name: 'Trainer Three', created: NOW, trainer: { plan: 'gold', since: NOW } },
    { id: 'c3', name: 'Client Three', created: NOW },
    { id: 'c4', name: 'Client Four', created: NOW },
    { id: 'y', name: 'To Disable', created: NOW }
  ],
  creds: [], subs: [], invites: [],
  links: [{ trainerId: 't1', clientId: 'c1', created: NOW }, { trainerId: 't2', clientId: 'c2', created: NOW },
    { trainerId: 't1', clientId: 'c3', created: NOW }, { trainerId: 't3', clientId: 'c4', created: NOW }],
  trainerInvites: [{ token: 'f'.repeat(32), trainerId: 't2', created: NOW }]
}));
fs.writeFileSync(path.join(DATA, 'records-c1.json'), JSON.stringify({ entries: [{ id: 'rec-c1', kind: 'weight', d: NOW.slice(0, 10), v: { kg: 70 }, by: 'c1', role: 'client', at: NOW }] }));
fs.writeFileSync(path.join(DATA, 'chat-c2.json'), JSON.stringify({ messages: [{ id: 'm1', from: 't2', text: 'private', at: NOW }], read: {} }));
fs.writeFileSync(path.join(DATA, 'state-c3.json'), JSON.stringify({ workouts: {}, bodyweight: { d: 1 }, routines: 'x' }));
const OLD = '2020-01-01T00:00:00.000Z';
fs.writeFileSync(path.join(DATA, 'chat-c4.json'), JSON.stringify({ messages: [{ id: 'o1', from: 'tOld', text: 'old private', at: OLD }, { id: 'o2', from: 'c4', text: 'to old trainer', at: OLD }], read: {} }));
fs.writeFileSync(path.join(DATA, 'assign-c4.json'), JSON.stringify({
  items: [{ id: 'a-old', date: NOW.slice(0, 10), name: 'Old plan', note: '', ex: [], by: 'tOld', sentAt: OLD }],
  profile: { goal: 'old notes', limits: '', focus: '', days: 3, notes: 'knee injury', macros: null, by: 'tOld' }
}));
fs.mkdirSync(path.join(DATA, 'content', 't2'), { recursive: true });
fs.writeFileSync(path.join(DATA, 'content', 't2', 'p1'), Buffer.from('89504e470d0a1a0a', 'hex'));
fs.writeFileSync(path.join(DATA, 'content-t2.json'), JSON.stringify({ posts: [{ id: 'p1', title: 'secret plan', body: '', link: '', file: { name: 'p.png', type: 'image/png', size: 8 }, at: NOW }] }));

const cookie = (uid, { exp = Date.now() + 86400000, ver = 0, secret = SECRET } = {}) => {
  const payload = `${uid}:${exp}:${ver}`;
  return 'gymsid=' + payload + '.' + crypto.createHmac('sha256', secret).update(payload).digest('base64url');
};
const as = Object.fromEntries(['admin', 't1', 't2', 'c1', 'c2', 'x', 't3', 'c3', 'c4', 'y'].map(u => [u, cookie(u)]));

let ipSeq = 0;
/** A request; each gets its own visitor address unless one is given, so limits stay out of the way. */
async function call(method, url, { who, cookie: ck, body, raw, headers = {}, ip } = {}) {
  const h = { 'CF-Connecting-IP': ip || `198.51.100.${(ipSeq++ % 250) + 1}`, ...headers };
  if (who || ck) h.Cookie = ck || as[who];
  if (method !== 'GET') { h['Content-Type'] = 'application/json'; h.Origin = h.Origin ?? ORIGIN; }
  const r = await fetch(BASE + url, { method, headers: h, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  let json = null; const text = await r.text();
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: r.status, json, text, headers: r.headers };
}
const get = (url, o) => call('GET', url, o);
const post = (url, body, o = {}) => call('POST', url, { ...o, body });

/* ---------------- server ---------------- */
let server;
test.before(async () => {
  server = spawn(process.execPath, ['server.js'], {
    cwd: API_DIR, env: { ...process.env, DATA_DIR: DATA, PORT: String(PORT), ORIGIN, RP_ID: 'localhost', ADMIN_UIDS: 'admin', INVITE_ONLY: '1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('API did not start')), 15000);
    server.stdout.on('data', d => { if (String(d).includes('gym-api on')) { clearTimeout(t); resolve(); } });
    server.on('exit', c => reject(new Error('API exited ' + c)));
  });
});
test.after(() => { server?.kill(); });

/* ================= authentication ================= */

test('auth: no session, a forged, an expired or an unknown-user cookie all get 401', async () => {
  for (const url of ['/api/me', '/api/data', '/api/records', '/api/trainer/clients', '/api/chat'])
    assert.equal((await get(url)).status, 401, 'no cookie ' + url);
  assert.equal((await get('/api/me', { cookie: cookie('t1', { secret: 'e'.repeat(64) }) })).status, 401, 'wrong key');
  assert.equal((await get('/api/me', { cookie: as.t1.replace(/.$/, c => (c === 'A' ? 'B' : 'A')) })).status, 401, 'tampered mac');
  assert.equal((await get('/api/me', { cookie: cookie('t1', { exp: Date.now() - 1000 }) })).status, 401, 'expired');
  assert.equal((await get('/api/me', { cookie: cookie('ghost') })).status, 401, 'unknown user');
  assert.equal((await get('/api/me', { cookie: 'gymsid=t1:9999999999999:0' })).status, 401, 'unsigned');
  // swapping the uid inside a valid cookie breaks its signature
  assert.equal((await get('/api/me', { cookie: as.c1.replace('c1:', 'admin:') })).status, 401, 'uid swap');
});

test('auth: "sign out everywhere" kills cookies issued before it', async () => {
  const old = cookie('x');
  assert.equal((await get('/api/me', { cookie: old })).status, 200);
  assert.equal((await post('/api/logout/all', {}, { cookie: old })).status, 200);
  assert.equal((await get('/api/me', { cookie: old })).status, 401);
  as.x = cookie('x', { ver: 1 });
  assert.equal((await get('/api/me', { who: 'x' })).status, 200, 'a cookie of the new version works');
});

test('auth: a disabled account is locked out, and only an admin can disable', async () => {
  assert.equal((await post('/api/admin/user/disable', { id: 'c2', disabled: true }, { who: 't1' })).status, 403);
  assert.equal((await post('/api/admin/user/disable', { id: 'c2', disabled: true }, { who: 'admin' })).status, 200);
  assert.equal((await get('/api/me', { who: 'c2' })).status, 401);
  assert.equal((await post('/api/admin/user/disable', { id: 'c2', disabled: false }, { who: 'admin' })).status, 200);
  assert.equal((await post('/api/admin/user/disable', { id: 'admin', disabled: true }, { who: 'admin' })).status, 400, 'admins cannot be disabled');
});

/* ================= authorization (who may read whom) ================= */

test('authz: clients and the intruder cannot use trainer or admin routes', async () => {
  for (const who of ['c1', 'x']) {
    assert.equal((await get('/api/trainer/clients', { who })).status, 403, who);
    assert.equal((await get('/api/trainer/client?id=c1', { who })).status, 403, who);
    assert.equal((await post('/api/trainer/invite', {}, { who })).status, 403, who);
    assert.equal((await get('/api/admin/users', { who })).status, 403, who);
    assert.equal((await post('/api/admin/demo-client', { trainerId: 't1' }, { who })).status, 403, who);
    assert.equal((await post('/api/admin/user/trainer', { id: who, plan: 'platinum' }, { who })).status, 403, 'self-promotion ' + who);
  }
  assert.equal((await get('/api/admin/users', { who: 't1' })).status, 403, 'a trainer is not an admin');
});

test('authz: a trainer cannot read or write another trainer\'s client', async () => {
  const other = 'c2';
  for (const url of [`/api/trainer/client?id=${other}`, `/api/trainer/client/assignments?id=${other}`, `/api/trainer/client/profile?id=${other}`, `/api/chat?with=${other}`])
    assert.equal((await get(url, { who: 't1' })).status, 403, url);
  const writes = [
    ['/api/trainer/client/records', { id: other, kind: 'weight', d: NOW.slice(0, 10), v: { kg: 80 } }],
    ['/api/trainer/client/profile', { id: other, goal: 'muscle' }],
    ['/api/trainer/client/assign', { id: other, date: NOW.slice(0, 10), name: 'x', ex: [{ id: '0001', sets: 3, reps: 10 }] }],
    ['/api/chat', { with: other, text: 'hi' }]
  ];
  for (const [url, body] of writes) assert.equal((await post(url, body, { who: 't1' })).status, 403, url);
  // removing someone else's client must not unlink them
  await post('/api/trainer/client/remove', { id: other }, { who: 't1' });
  const t2 = await get('/api/trainer/clients', { who: 't2' });
  assert.ok(t2.json.clients.some(c => c.id === other), 't2 still has c2');
});

test('authz: private chat and content stay with the trainer and their own clients', async () => {
  const chat = await get('/api/chat', { who: 'c1' });
  assert.ok(!JSON.stringify(chat.json).includes('private'), 'c1 never sees c2\'s conversation');
  for (const who of ['c1', 'x', 't1'])
    assert.equal((await get('/api/content/file?trainer=t2&post=p1', { who })).status, 403, who);
  assert.equal((await get('/api/content/file?trainer=t2&post=p1', { who: 't2' })).status, 200, 'the owner can');
  const feed = await get('/api/content', { who: 'x' });
  assert.deepEqual(feed.json.posts, [], 'no trainer, no feed');
});

test('authz: only whoever logged a record can delete it, and invites are the owner\'s to revoke', async () => {
  const r = await post('/api/trainer/client/records/delete', { id: 'c1', record: 'rec-c1' }, { who: 't1' });
  assert.equal(r.status, 400);
  assert.match(r.json.error, /only whoever logged/);
  assert.equal((await post('/api/records/delete', { id: 'rec-c1' }, { who: 'x' })).status, 400, 'not in the intruder\'s file');
  assert.equal((await post('/api/trainer/invite/revoke', { token: 'f'.repeat(32) }, { who: 't1' })).status >= 400, true);
  assert.equal((await get('/api/invite?token=' + 'f'.repeat(32))).status, 200, 'the invite survived');
});

/* ================= injection, traversal, uploads ================= */

test('traversal: ids and paths with ../ never reach other files', async () => {
  for (const url of ['/api/content/file?trainer=../../&post=../db.json', '/api/content/file?trainer=t2&post=../../db.json',
    '/api/content/file?trainer=t2&post=..%2F..%2Fsecret', '/api/chat?with=../db', '/api/trainer/client?id=..%2Fdb'])
    for (const who of ['t2', 'c1']) {
      const r = await get(url, { who });
      // a client's ?with= is ignored: they only ever get their own conversation
      const ownChat = who === 'c1' && url.startsWith('/api/chat') && r.status === 200 && r.json.me === 'c1' && r.json.other.id === 't1';
      assert.ok(ownChat || [400, 403, 404].includes(r.status), `${who} ${url} → ${r.status}`);
      assert.ok(!r.text.includes(SECRET) && !r.text.includes('"creds"'), 'no file content leaks');
    }
});

test('uploads: the declared type must match the bytes, and only images and PDF are accepted', async () => {
  const up = (type, data, name = 'f') => post('/api/trainer/content', { title: 't', file: { name, type, data: Buffer.from(data).toString('base64') } }, { who: 't1' });
  assert.equal((await up('image/png', '<html><script>alert(1)</script>')).status, 400, 'HTML posing as PNG');
  assert.equal((await up('image/svg+xml', '<svg onload="alert(1)"/>')).status, 400, 'SVG');
  assert.equal((await up('text/html', '<b>x</b>')).status, 400, 'HTML');
  assert.equal((await up('constructor', 'x')).status, 400, 'inherited property name as a type');
  assert.equal((await up('toString', 'x')).status, 400, 'inherited property name as a type');
  const ok = await up('image/png', Buffer.from('89504e470d0a1a0a00', 'hex'), '../../evil".png');
  assert.equal(ok.status, 200);
  assert.ok(!/[/"\\]/.test(ok.json.post.file.name), 'file name sanitised: ' + ok.json.post.file.name);
  const link = await post('/api/trainer/content', { title: 't', link: 'javascript:alert(1)' }, { who: 't1' });
  assert.equal(link.status, 400, 'javascript: links refused');
});

test('mass assignment: extra fields and __proto__ never grant anything', async () => {
  await post('/api/trainer/profile', { name: 'T1', __proto__: { admin: true }, admin: true, trainer: { plan: 'platinum' } }, { who: 't1',
    raw: '{"name":"T1","__proto__":{"admin":true},"constructor":{"prototype":{"admin":true}},"admin":true}' });
  const me = await get('/api/me', { who: 't1' });
  assert.equal(me.json.user.admin, false);
  assert.equal(me.json.user.trainer.plan, 'silver');
  assert.equal((await get('/api/admin/users', { who: 't1' })).status, 403);
  assert.equal(({}).admin, undefined, 'Object.prototype untouched in this process');
  const x = await get('/api/me', { who: 'c1' });
  assert.equal(x.json.user.admin, false, 'and in the server');
});

test('validation: inherited property names are not plans, providers or record kinds', async () => {
  for (const plan of ['constructor', 'toString', '__proto__', 'hasOwnProperty'])
    assert.equal((await post('/api/admin/user/trainer', { id: 'x', plan }, { who: 'admin' })).status, 400, plan);
  assert.equal((await post('/api/records', { kind: 'constructor', d: NOW.slice(0, 10), v: { a: 1 } }, { who: 'c1' })).status, 400);
  const me = await get('/api/me', { who: 'x' });
  assert.equal(me.json.user.trainer, null, 'x is still not a trainer');
});

test('validation: oversized fields are refused, not truncated into storage', async () => {
  assert.equal((await post('/api/chat', { text: 'x'.repeat(2001) }, { who: 'c1' })).status, 400);
  assert.equal((await post('/api/trainer/profile', { name: 'x'.repeat(61) }, { who: 't1' })).status, 400);
  assert.equal((await post('/api/trainer/profile', { name: 'ok', certifications: ['x'.repeat(121)] }, { who: 't1' })).status, 400);
});

/* ================= request hygiene ================= */

test('http: writes from another site are refused; reads are not', async () => {
  assert.equal((await post('/api/chat', { text: 'hi' }, { who: 'c1', headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await get('/api/me', { who: 'c1', headers: { Origin: 'https://evil.example' } })).status, 200);
});

test('http: oversized and malformed bodies get 413 and 400, not a crash', async () => {
  const big = await call('POST', '/api/chat', { who: 'c1', raw: JSON.stringify({ text: 'x'.repeat(300 * 1024) }) });
  assert.equal(big.status, 413);
  const bad = await call('POST', '/api/chat', { who: 'c1', raw: '{"text":' });
  assert.equal(bad.status, 400);
  assert.equal((await get('/api/me', { who: 'c1' })).status, 200, 'the server is still up');
});

test('http: API responses are never cached or sniffed, unknown routes are a JSON 404', async () => {
  const r = await get('/api/me', { who: 'c1' });
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  const nf = await get('/api/../../etc/passwd');
  assert.equal(nf.status, 404);
  assert.equal(nf.json.error, 'not found');
});

test('http: the public health check gives nothing away', async () => {
  const r = await get('/api/health');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true });
});

test('http: sign-in and invite probing is rate limited per visitor', async () => {
  const ip = '203.0.113.77';
  const codes = [];
  for (let i = 0; i < 23; i++) codes.push((await get('/api/invite?token=' + crypto.randomBytes(16).toString('hex'), { ip })).status);
  assert.ok(codes.slice(0, 20).every(c => c !== 429), 'first 20 answered');
  assert.equal(codes[22], 429, 'then 429');
  assert.notEqual((await get('/api/invite?token=x', { ip: '203.0.113.78' })).status, 429, 'other visitors unaffected');
});

/* ================= plans ================= */

test('plans: a Free trainer\'s client cannot log meals, a Silver one can', async () => {
  const meal = { kind: 'meal', d: NOW.slice(0, 10), v: { meal: 'lunch', text: 'rice' } };
  assert.equal((await post('/api/records', meal, { who: 'c2' })).status, 403);
  assert.equal((await post('/api/records', meal, { who: 'c1' })).status, 200);
  assert.equal((await post('/api/records', meal, { who: 'x' })).status, 403, 'no trainer, no meal log');
});

/* ================= audit regressions (security-audit run-1) ================= */

const KEYS = { p256dh: 'B' + 'a'.repeat(86), auth: 'c'.repeat(22) };

test('push: only real push services can be subscribed, and each account keeps at most ten', async () => {
  for (const endpoint of ['https://127.0.0.1:8443/probe', 'http://fcm.googleapis.com/x', 'https://fcm.googleapis.com:444/x',
    'https://169.254.169.254/latest', 'https://evil.example/fcm.googleapis.com', 'https://user@fcm.googleapis.com/x'])
    assert.equal((await post('/api/push/subscribe', { subscription: { endpoint, keys: KEYS } }, { who: 'x' })).status, 400, endpoint);
  assert.equal((await post('/api/push/subscribe', { subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/x0', keys: { p256dh: 'a'.repeat(300), auth: KEYS.auth } } }, { who: 'x' })).status, 400, 'oversized key');
  for (let i = 0; i < 12; i++)
    assert.equal((await post('/api/push/subscribe', { subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/x' + i, keys: KEYS } }, { who: 'x' })).status, 200);
  await new Promise(r => setTimeout(r, 300));
  const db = JSON.parse(fs.readFileSync(path.join(DATA, 'db.json'), 'utf8'));
  assert.equal(db.subs.filter(s => s.userId === 'x').length, 10);
  assert.deepEqual(Object.keys(db.subs[0].keys).sort(), ['auth', 'p256dh'], 'only the two keys are stored');
});

test('state: fields the server reads back must have their real type', async () => {
  for (const state of [{ workouts: {} }, { routines: 'x' }, { bodyweight: 5 }, { reminder: [] }, { week: 'mon' }])
    assert.equal((await call('PUT', '/api/data', { who: 'x', body: { state } })).status, 400, JSON.stringify(state));
  assert.equal((await call('PUT', '/api/data', { who: 'x', body: { state: [] } })).status, 400);
  assert.equal((await call('PUT', '/api/data', { who: 'x', body: { state: { workouts: [], reminder: { on: false } } } })).status, 200);
});

test('http: a JSON body that is not an object is a 400, not a 500', async () => {
  for (const raw of ['null', '5', '[]', '"x"'])
    assert.equal((await call('POST', '/api/chat', { who: 'c1', raw })).status, 400, raw);
});

test('trainer: one client\'s malformed state does not take down the client list', async () => {
  const r = await get('/api/trainer/clients', { who: 't1' });
  assert.equal(r.status, 200);
  assert.ok(r.json.clients.some(c => c.id === 'c3'), 'the malformed client is still listed');
  assert.ok(r.json.clients.some(c => c.id === 'c1'));
  assert.equal((await get('/api/trainer/client?id=c3', { who: 't1' })).status, 200);
});

test('trainer: a new trainer does not see what the client shared with a former one', async () => {
  const chat = await get('/api/chat?with=c4', { who: 't3' });
  assert.equal(chat.status, 200);
  assert.ok(!chat.text.includes('old private') && !chat.text.includes('to old trainer'), 'former conversation hidden');
  const mineChat = await get('/api/chat', { who: 'c4' });
  assert.ok(!mineChat.text.includes('old private'), 'and on the client side');
  const a = await get('/api/trainer/client/assignments?id=c4', { who: 't3' });
  assert.equal(a.status, 200);
  assert.equal(a.json.assignments.length, 0, 'former trainer\'s assignments hidden');
  assert.ok(!a.text.includes('knee injury'), 'former trainer\'s notes hidden');
  assert.ok(!(await get('/api/trainer/client/profile?id=c4', { who: 't3' })).text.includes('knee injury'));
  assert.equal((await post('/api/trainer/client/assign/delete', { id: 'c4', assignment: 'a-old' }, { who: 't3' })).status, 400, 'cannot delete them either');
});

test('trainer: leaving a trainer drops their notes about the client', async () => {
  assert.equal((await post('/api/trainer/client/profile', { id: 'c4', goal: 'new goal', notes: 'new notes' }, { who: 't3' })).status, 200);
  assert.ok((await get('/api/trainer/client/profile?id=c4', { who: 't3' })).text.includes('new notes'));
  assert.equal((await post('/api/me/trainer/leave', {}, { who: 'c4' })).status, 200);
  await new Promise(r => setTimeout(r, 300));
  const file = JSON.parse(fs.readFileSync(path.join(DATA, 'assign-c4.json'), 'utf8'));
  assert.equal(file.profile, null);
});

test('admin: disabling an account removes its push subscriptions', async () => {
  assert.equal((await post('/api/push/subscribe', { subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/y1', keys: KEYS } }, { who: 'y' })).status, 200);
  assert.equal((await post('/api/admin/user/disable', { id: 'y', disabled: true }, { who: 'admin' })).status, 200);
  const list = await get('/api/admin/users', { who: 'admin' });
  assert.equal(list.json.users.find(u => u.id === 'y').hasPush, false);
  assert.equal((await get('/api/me', { who: 'y' })).status, 401);
});

test('server: still up after every regression above', async () => {
  assert.equal((await get('/api/health')).status, 200);
});

/* ================= client content, meals, reactions, comments, photos ================= */

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64');
const TODAY = new Date().toISOString().slice(0, 10);

test('content: a client sees the trainer\'s posts and the file, nobody else does', async () => {
  const made = await post('/api/trainer/content', { title: 'Plan de piernas', body: 'Sentadillas lunes' }, { who: 't1' });
  assert.equal(made.status, 200);
  const mine = await get('/api/content', { who: 'c1' });
  assert.ok(mine.json.posts.some(p => p.title === 'Plan de piernas'), 'linked client sees it');
  assert.equal(mine.json.trainer.id, 't1');
  assert.ok(!(await get('/api/content', { who: 'x' })).json.posts.some(p => p.title === 'Plan de piernas'), 'unlinked does not');
  assert.ok(!(await get('/api/content', { who: 'c2' })).json.posts.some(p => p.title === 'Plan de piernas'), 'other trainer\'s client does not');
});

test('meals: a client logs a meal with its description and calories, and the day adds up', async () => {
  const meal = { kind: 'meal', d: TODAY, v: { meal: 'lunch', text: 'arroz con pollo', kcal: 600, protein: 40 } };
  assert.equal((await post('/api/records', meal, { who: 'c1' })).status, 200);
  assert.equal((await post('/api/records', { kind: 'meal', d: TODAY, v: { meal: 'dinner', text: 'ensalada', kcal: 250, carbs: 20 } }, { who: 'c1' })).status, 200);
  const list = await get('/api/records?day=' + TODAY, { who: 'c1' });
  assert.ok(list.json.today.meals >= 2);
  assert.ok(list.json.today.kcal >= 850, 'calories add up: ' + list.json.today.kcal);
  assert.ok(list.json.records.some(e => e.v.text === 'arroz con pollo'), 'the description is kept');
  assert.equal((await post('/api/records', { kind: 'meal', d: TODAY, v: { meal: 'lunch', text: 'x', kcal: 99999 } }, { who: 'c1' })).status, 400, 'absurd calories refused');
});

test('measures: height is a measurement, and out-of-range heights are refused', async () => {
  assert.equal((await post('/api/records', { kind: 'measures', d: TODAY, v: { height: 172, waist: 80 } }, { who: 'c1' })).status, 200);
  assert.equal((await post('/api/records', { kind: 'measures', d: TODAY, v: { height: 40 } }, { who: 'c1' })).status, 400);
  const list = await get('/api/records?day=' + TODAY, { who: 'c1' });
  assert.ok(list.json.records.some(e => e.kind === 'measures' && e.v.height === 172));
});

test('comments: only the client\'s trainer comments on a meal, and the client can read it', async () => {
  const list = await get('/api/records?day=' + TODAY, { who: 'c1' });
  const meal = list.json.records.find(e => e.kind === 'meal' && e.v.text === 'arroz con pollo');
  assert.ok(meal);
  assert.equal((await post('/api/social/comment', { owner: 'c1', record: meal.id, text: 'Buena proteina, sigue asi' }, { who: 't1' })).status, 200);
  assert.equal((await post('/api/social/comment', { owner: 'c1', record: meal.id, text: 'hola' }, { who: 'c1' })).status, 404, 'a client cannot comment');
  assert.equal((await post('/api/social/comment', { owner: 'c1', record: meal.id, text: 'hola' }, { who: 'x' })).status, 404, 'a stranger cannot');
  assert.equal((await post('/api/social/comment', { owner: 'c1', record: meal.id, text: 'hola' }, { who: 't2' })).status, 404, 'another trainer cannot');
  assert.equal((await post('/api/social/comment', { owner: 'c1', record: meal.id, text: '   ' }, { who: 't1' })).status, 400, 'empty refused');
  const seen = await get('/api/social?owner=c1', { who: 'c1' });
  assert.ok(seen.json.comments[meal.id].some(x => x.text.includes('proteina')), 'the client reads it');
  assert.equal((await get('/api/social?owner=c1', { who: 'x' })).status, 404, 'a stranger cannot read it');
});

test('reactions: trainer reacts to a workout, client to the trainer\'s post; one per person, toggled', async () => {
  const r1 = await post('/api/social/react', { owner: 'c1', key: 'w:entreno-1', e: '🔥' }, { who: 't1' });
  assert.equal(r1.status, 200);
  assert.equal(r1.json.reactions.length, 1);
  const r2 = await post('/api/social/react', { owner: 'c1', key: 'w:entreno-1', e: '👏' }, { who: 't1' });
  assert.deepEqual(r2.json.reactions.map(x => x.e), ['👏'], 'a new emoji replaces the old one');
  const r3 = await post('/api/social/react', { owner: 'c1', key: 'w:entreno-1', e: '👏' }, { who: 't1' });
  assert.deepEqual(r3.json.reactions, [], 'the same emoji again takes it back');
  assert.equal((await post('/api/social/react', { owner: 'c1', key: 'w:entreno-1', e: '💩' }, { who: 't1' })).status, 400, 'only listed reactions');
  assert.equal((await post('/api/social/react', { owner: 'c1', key: 'p:abc', e: '🔥' }, { who: 't1' })).status, 400, 'a client\'s items are not content');
  assert.equal((await post('/api/social/react', { owner: 'c1', key: 'w:entreno-1', e: '🔥' }, { who: 'x' })).status, 404, 'a stranger cannot react');
  assert.equal((await post('/api/social/react', { owner: 'c1', key: 'w:entreno-1', e: '🔥' }, { who: 'c1' })).status, 404, 'nobody reacts to their own');
  const postId = (await get('/api/content', { who: 'c1' })).json.posts.find(p => p.title === 'Plan de piernas').id;
  assert.equal((await post('/api/social/react', { owner: 't1', key: 'p:' + postId, e: '💪' }, { who: 'c1' })).status, 200, 'the client reacts to the trainer\'s post');
  assert.equal((await post('/api/social/react', { owner: 't1', key: 'p:' + postId, e: '💪' }, { who: 'x' })).status, 404, 'an unlinked person cannot');
});

test('photos: a client uploads progress photos, the trainer sees them, a stranger does not', async () => {
  const up = await post('/api/photos', { d: TODAY, note: 'semana 1', file: { type: 'image/png', data: PNG } }, { who: 'c1' });
  assert.equal(up.status, 200);
  const id = up.json.photo.id;
  assert.ok((await get('/api/photos', { who: 'c1' })).json.photos.some(p => p.id === id));
  assert.ok((await get('/api/photos?owner=c1', { who: 't1' })).json.photos.some(p => p.id === id), 'the linked trainer sees it');
  assert.equal((await get('/api/photos?owner=c1', { who: 'x' })).status, 404, 'a stranger does not');
  const file = await get('/api/photos/file?owner=c1&id=' + id, { who: 't1' });
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'image/png');
  assert.equal((await get('/api/photos/file?owner=c1&id=' + id, { who: 'x' })).status, 404, 'files are private');
  assert.equal((await post('/api/photos', { d: TODAY, file: { type: 'image/gif', data: PNG } }, { who: 'c1' })).status, 400, 'only JPG, PNG, WebP');
  assert.equal((await post('/api/photos', { d: TODAY, file: { type: 'image/png', data: Buffer.from('not a png at all').toString('base64') } }, { who: 'c1' })).status, 400, 'bytes must match the type');
  assert.equal((await post('/api/photos/delete', { id }, { who: 'x' })).status, 404, 'only the owner deletes');
  assert.equal((await post('/api/photos/delete', { id }, { who: 'c1' })).status, 200);
  assert.equal((await get('/api/photos', { who: 'c1' })).json.photos.some(p => p.id === id), false, 'and it is gone');
});

test('photos: a full-size 3.5 MB photo uploads (the body limit fits its base64)', async () => {
  const big = Buffer.alloc(3.4 * 1024 * 1024);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(big);
  const r = await post('/api/photos', { d: TODAY, note: 'grande', file: { type: 'image/png', data: big.toString('base64') } }, { who: 'c1' });
  assert.equal(r.status, 200, r.text.slice(0, 120));
});


test('google sign-in: off on an instance without its secrets, and nothing leaks', async () => {
  assert.equal((await get('/api/config')).json.google, false);
  assert.equal((await get('/api/auth/google/start')).status, 404);
  const r = await fetch(BASE + '/api/auth/google/callback?state=x&code=y', { redirect: 'manual' });
  assert.equal(r.status, 302, 'the callback only redirects');
  assert.match(r.headers.get('location'), /google=off/);
  assert.equal(r.headers.get('set-cookie'), null, 'no session is set');
});
