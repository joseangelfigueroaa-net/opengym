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

test('gold holds 25 clients and platinum 50', () => {
  assert.equal(T.PLAN_LIMITS.gold, 25);
  assert.equal(T.PLAN_LIMITS.platinum, 50);
  const db = fresh();
  T.setTrainer(user(db, 'pro'), 'gold');
  for (let i = 0; i < 25; i++) T.createInvite(db, user(db, 'pro'), NOW);
  assert.equal(code(() => T.createInvite(db, user(db, 'pro'), NOW)), 'limit');
  T.setTrainer(user(db, 'pro'), 'platinum');
  assert.equal(T.limitOf(user(db, 'pro')), 50);
  assert.doesNotThrow(() => T.createInvite(db, user(db, 'pro'), NOW));
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

/* ---------------- audit regressions ---------------- */

test('a link that signed someone up is theirs alone: nobody else can sign up or accept with it', () => {
  const db = fresh();
  const inv = T.createInvite(db, user(db, 'pro'), NOW);
  T.usableInvite(db, inv.token, NOW).inv.signupBy = 'c1';             // what register/verify does
  assert.equal(code(() => T.usableInvite(db, inv.token, NOW)), 'used', 'a second signup is refused');
  assert.equal(code(() => T.acceptInvite(db, user(db, 'c2'), inv.token, NOW)), 'used', 'someone else cannot take it');
  assert.ok(T.usableInvite(db, inv.token, NOW, user(db, 'c1')), 'the new profile still sees it');
  T.acceptInvite(db, user(db, 'c1'), inv.token, NOW);
  assert.ok(T.isLinked(db, 'pro', 'c1'));
});

test('a client summary survives any shape of client-written state', () => {
  const link = { trainerId: 'pro', clientId: 'c1', created: new Date(NOW).toISOString() };
  for (const S of [null, [], 'x', { workouts: {} }, { workouts: 'abc', bodyweight: {} }, { bodyweight: [{ d: 1, w: 80 }, null] }, { routines: 5, week: [] }]) {
    const s = T.clientSummary({ id: 'c1', name: 'María' }, link, S, null, NOW);
    assert.equal(s.workouts, 0, JSON.stringify(S));
    T.clientDetail({ id: 'c1', name: 'María' }, link, S, null, NOW);
  }
});

/* ---------------- calories per day ---------------- */

import * as RR from "../trainer/records.js";

test("the day total adds up meals of that day only, macro by macro", () => {
  const entries = [
    { kind: "meal", d: "2026-10-22", v: { meal: "lunch", text: "a", kcal: 600, protein: 40 } },
    { kind: "meal", d: "2026-10-22", v: { meal: "dinner", text: "b", kcal: 250, carbs: 20 } },
    { kind: "meal", d: "2026-10-21", v: { meal: "lunch", text: "c", kcal: 900 } },
    { kind: "weight", d: "2026-10-22", v: { kg: 80 } }
  ];
  const t = RR.dayTotals(entries, "2026-10-22");
  assert.equal(t.meals, 2);
  assert.equal(t.kcal, 850);
  assert.equal(t.protein, 40);
  assert.equal(t.carbs, 20);
  assert.equal(RR.dayTotals(undefined, "2026-10-22").kcal, 0, "no records, zero");
});

test('progress signal: words for the gym, toward the target weight and on the weekly plan', () => {
  const now = Date.parse('2026-11-01T12:00:00Z'), day = n => new Date(now - n * 86400000).toISOString().slice(0, 10)
  const ok = { code: 'ok' }
  const losing = { targetW: 68, bodyweight: [{ d: day(30), w: 74 }, { d: day(15), w: 73 }, { d: day(1), w: 72 }] }
  assert.equal(T.progressSignal(losing, null, ok, now).trend, 'advancing')
  const gaining = { targetW: 68, bodyweight: [{ d: day(30), w: 72 }, { d: day(1), w: 73 }] }
  assert.equal(T.progressSignal(gaining, null, ok, now).trend, 'off_track')
  assert.equal(T.progressSignal({ bodyweight: losing.bodyweight }, null, ok, now).trend, null, 'no target, nothing to say')
  assert.equal(T.progressSignal(losing, null, { code: 'inactive' }, now).trend, 'inactive')
  // three planned days a week: 11 of 12 sessions in four weeks is on plan, 3 of 12 is behind
  const sessions = n => Array.from({ length: n }, (_, k) => ({ d: day(1 + k * 2) }))
  const week = { 1: 'a', 3: 'b', 5: 'a' }
  assert.equal(T.progressSignal({ week, workouts: sessions(11) }, null, ok, now).plan, 'on_plan')
  assert.equal(T.progressSignal({ week, workouts: sessions(3) }, null, ok, now).plan, 'behind')
  assert.equal(T.progressSignal({ workouts: sessions(3) }, null, ok, now).plan, null, 'no weekly plan')
  // only words travel: no figure the gym could read a weight or a percentage from
  const sig = T.progressSignal({ ...losing, week, workouts: sessions(11) }, null, ok, now)
  assert.deepEqual(Object.keys(sig).sort(), ['plan', 'trend'])
  assert.ok(Object.values(sig).every(v => typeof v === 'string'))
})
