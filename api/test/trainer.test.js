import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../trainer/logic.js';

const NOW = Date.parse('2026-10-20T12:00:00Z');
const fresh = () => T.ensureShape({
  users: [
    { id: 'coach', name: 'Ana', trainer: { plan: 'free' } },
    { id: 'pro', name: 'Luis', trainer: { plan: 'silver' } },
    { id: 'c1', name: 'María' },
    { id: 'c2', name: 'Pedro' },
    { id: 'c3', name: 'Rosa' }
  ]
});
const user = (db, id) => db.users.find(u => u.id === id);
const code = fn => { try { fn(); } catch (e) { return e.code; } return null; };

/* ---------------- invites and seats ---------------- */

test('only a trainer can make an invite link', () => {
  const db = fresh();
  assert.equal(code(() => T.createInvite(db, user(db, 'c1'), NOW)), 'not_trainer');
});

test('an invite link is a 128-bit token made on the server', () => {
  const db = fresh();
  const inv = T.createInvite(db, user(db, 'pro'), NOW);
  assert.match(inv.token, /^[0-9a-f]{32}$/);
  assert.equal(inv.trainerId, 'pro');
});

test('an open invite holds a seat, so a free trainer gets one link for one seat', () => {
  const db = fresh();
  T.createInvite(db, user(db, 'coach'), NOW);
  assert.equal(code(() => T.createInvite(db, user(db, 'coach'), NOW)), 'limit');
});

test('silver allows five seats, not six', () => {
  const db = fresh();
  for (let i = 0; i < 5; i++) T.createInvite(db, user(db, 'pro'), NOW);
  assert.equal(code(() => T.createInvite(db, user(db, 'pro'), NOW)), 'limit');
});

test('an expired invite frees its seat and can no longer be used', () => {
  const db = fresh();
  const inv = T.createInvite(db, user(db, 'coach'), NOW);
  const later = NOW + (T.INVITE_DAYS + 1) * 86400000;
  assert.equal(T.seatsUsed(db, 'coach', later), 0);
  assert.equal(code(() => T.acceptInvite(db, user(db, 'c1'), inv.token, later)), 'expired');
  assert.ok(T.createInvite(db, user(db, 'coach'), later));
});

test('revoking an open invite frees the seat; someone else\'s cannot be revoked', () => {
  const db = fresh();
  const inv = T.createInvite(db, user(db, 'coach'), NOW);
  assert.equal(code(() => T.revokeInvite(db, user(db, 'pro'), inv.token)), 'invalid');
  T.revokeInvite(db, user(db, 'coach'), inv.token);
  assert.equal(T.seatsUsed(db, 'coach', NOW), 0);
});

/* ---------------- accepting ---------------- */

test('accepting links the client and spends the invite', () => {
  const db = fresh();
  const inv = T.createInvite(db, user(db, 'pro'), NOW);
  const { trainer } = T.acceptInvite(db, user(db, 'c1'), inv.token, NOW);
  assert.equal(trainer.id, 'pro');
  assert.ok(T.isLinked(db, 'pro', 'c1'));
  assert.equal(inv.usedBy, 'c1');
  assert.equal(code(() => T.acceptInvite(db, user(db, 'c2'), inv.token, NOW)), 'used');
});

test('tokens are matched case-insensitively, since signup codes arrive upper-cased', () => {
  const db = fresh();
  const inv = T.createInvite(db, user(db, 'pro'), NOW);
  assert.ok(T.usableInvite(db, inv.token.toUpperCase(), NOW));
});

test('a trainer cannot accept their own link', () => {
  const db = fresh();
  const inv = T.createInvite(db, user(db, 'pro'), NOW);
  assert.equal(code(() => T.acceptInvite(db, user(db, 'pro'), inv.token, NOW)), 'self');
});

test('a client has one trainer at a time', () => {
  const db = fresh();
  T.acceptInvite(db, user(db, 'c1'), T.createInvite(db, user(db, 'pro'), NOW).token, NOW);
  const other = T.createInvite(db, user(db, 'coach'), NOW);
  assert.equal(code(() => T.acceptInvite(db, user(db, 'c1'), other.token, NOW)), 'has_trainer');
  assert.equal(other.usedBy, undefined);   // the refused invite stays usable for someone else
});

test('a link from a trainer who lost the role or was disabled is dead', () => {
  const db = fresh();
  const inv = T.createInvite(db, user(db, 'pro'), NOW);
  T.setTrainer(user(db, 'pro'), null);
  assert.equal(code(() => T.acceptInvite(db, user(db, 'c1'), inv.token, NOW)), 'invalid');
  T.setTrainer(user(db, 'pro'), 'silver');
  user(db, 'pro').disabled = true;
  assert.equal(code(() => T.acceptInvite(db, user(db, 'c1'), inv.token, NOW)), 'invalid');
});

test('a plan downgraded below its clients refuses further acceptances', () => {
  const db = fresh();
  const a = T.createInvite(db, user(db, 'pro'), NOW), b = T.createInvite(db, user(db, 'pro'), NOW);
  T.acceptInvite(db, user(db, 'c1'), a.token, NOW);
  T.setTrainer(user(db, 'pro'), 'free');
  assert.equal(code(() => T.acceptInvite(db, user(db, 'c2'), b.token, NOW)), 'limit');
});

/* ---------------- reading a client ---------------- */

test('a trainer reads only their own clients', () => {
  const db = fresh();
  T.acceptInvite(db, user(db, 'c1'), T.createInvite(db, user(db, 'pro'), NOW).token, NOW);
  assert.equal(code(() => T.assertCanRead(db, user(db, 'pro'), 'c1')), null);
  assert.equal(code(() => T.assertCanRead(db, user(db, 'pro'), 'c2')), 'not_linked');
  assert.equal(code(() => T.assertCanRead(db, user(db, 'coach'), 'c1')), 'not_linked');
  assert.equal(code(() => T.assertCanRead(db, user(db, 'c2'), 'c1')), 'not_trainer');
});

test('unlinking ends read access and frees the seat', () => {
  const db = fresh();
  T.acceptInvite(db, user(db, 'c1'), T.createInvite(db, user(db, 'coach'), NOW).token, NOW);
  T.unlink(db, 'coach', 'c1');
  assert.equal(code(() => T.assertCanRead(db, user(db, 'coach'), 'c1')), 'not_linked');
  assert.equal(T.seatsUsed(db, 'coach', NOW), 0);
  assert.equal(code(() => T.unlink(db, 'coach', 'c1')), 'not_linked');
});

test('the client file carries progress but nothing Coach- or device-private', () => {
  const S = {
    unit: 'kg', targetW: 70, _ts: 5,
    bodyweight: [{ d: '2026-10-01', w: 74 }, { d: '2026-10-18', w: 72.4 }],
    workouts: [{ d: '2026-08-01' }, { d: '2026-10-10' }, { d: '2026-10-19' }],
    routines: [{ id: 'r1', name: 'Fuerza', emoji: '💪', ex: [{}, {}] }],
    coach: { consent: { agreedAt: 'x' } }, active: { started: 1 }
  };
  const d = T.clientDetail({ id: 'c1', name: 'María' }, { created: '2026-09-01' }, S, null, NOW);
  assert.equal(d.weight, 72.4);
  assert.equal(d.workouts, 3);
  assert.equal(d.last30, 2);
  assert.equal(d.lastWorkout, '2026-10-19');
  assert.deepEqual(d.routines.map(({ id, name, emoji, count }) => ({ id, name, emoji, count })), [{ id: 'r1', name: 'Fuerza', emoji: '💪', count: 2 }]);
  assert.equal(d.routines[0].ex.length, 2);   // exercises ride along so the trainer can start from a routine
  assert.deepEqual(d.history.map(w => w.d), ['2026-10-19', '2026-10-10', '2026-08-01']);
  assert.equal(d.coach, undefined);
  assert.equal(d.active, undefined);
});

test('a client who never synced still has a summary', () => {
  const s = T.clientSummary({ id: 'c1', name: 'María' }, { created: '2026-09-01' }, null, null, NOW);
  assert.equal(s.workouts, 0);
  assert.equal(s.weight, null);
});
