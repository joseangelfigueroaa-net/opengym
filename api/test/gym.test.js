import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../trainer/gym.js';
import * as T from '../trainer/logic.js';

const NOW = Date.parse('2026-10-20T12:00:00Z');
const fresh = () => G.ensureShape({
  users: [
    { id: 'owner', name: 'Dueño' },
    { id: 'ana', name: 'Ana' },
    { id: 'luis', name: 'Luis', trainer: { plan: 'silver' } },
    { id: 'out', name: 'Externo', trainer: { plan: 'gold' } },
    { id: 'm1', name: 'María' }, { id: 'm2', name: 'Pedro' }, { id: 'm3', name: 'Rosa' }, { id: 'm4', name: 'Juan' }
  ]
});
const user = (db, id) => db.users.find(u => u.id === id);
const code = fn => { try { fn(); } catch (e) { return e.code; } return null; };
// A gym with Ana and Luis on staff and four members.
function setup(shifts = {}) {
  const db = fresh();
  const gym = G.setGym(db, user(db, 'owner'), { name: 'Gym Centro', plan: 'basic' }, NOW);
  for (const id of ['ana', 'luis']) G.join(db, user(db, id), G.createInvite(db, gym, 'trainer', NOW).token, { shift: shifts[id] }, NOW);
  const code = G.createInvite(db, gym, 'member', NOW).token;
  for (const id of ['m1', 'm2', 'm3', 'm4']) G.join(db, user(db, id), code, { shift: shifts[id] }, NOW + 1000);
  return { db, gym };
}

test('an admin makes a gym; one per owner, and a bad plan is refused', () => {
  const db = fresh();
  const g = G.setGym(db, user(db, 'owner'), { name: '  Gym  Centro ', plan: 'pro' }, NOW);
  assert.equal(g.name, 'Gym Centro');
  assert.equal(G.setGym(db, user(db, 'owner'), { plan: 'basic' }, NOW).id, g.id);
  assert.equal(db.gyms.length, 1);
  assert.equal(code(() => G.setGym(db, user(db, 'ana'), { name: 'x', plan: 'constructor' })), 'bad');
  assert.equal(G.roleOf(db, user(db, 'owner')).role, 'owner');
});

test('a staff link makes a non-trainer a trainer, paid by the gym, and works once', () => {
  const db = fresh();
  const gym = G.setGym(db, user(db, 'owner'), { name: 'G', plan: 'basic' }, NOW);
  const inv = G.createInvite(db, gym, 'trainer', NOW);
  G.join(db, user(db, 'ana'), inv.token, { shift: 'morning' }, NOW);
  assert.equal(user(db, 'ana').trainer.plan, G.STAFF_PLAN);
  assert.equal(user(db, 'ana').trainer.viaGym, gym.id);
  assert.equal(code(() => G.join(db, user(db, 'm1'), inv.token, {}, NOW)), 'used');
  assert.deepEqual(G.roleOf(db, user(db, 'ana')), { id: gym.id, name: 'G', role: 'trainer', shift: 'morning', brand: null });
});

test('the member code is reusable, but a person belongs to one gym', () => {
  const { db, gym } = setup();
  assert.equal(G.membersOf(db, gym.id).length, 4);
  const other = G.setGym(db, user(db, 'out'), { name: 'Otro', plan: 'basic' }, NOW);
  const c = G.createInvite(db, other, 'member', NOW).token;
  assert.equal(code(() => G.join(db, user(db, 'm1'), c, {}, NOW)), 'has_gym');
});

test('a new member code replaces the old one, and codes expire', () => {
  const db = fresh();
  const gym = G.setGym(db, user(db, 'owner'), { name: 'G', plan: 'basic' }, NOW);
  const a = G.createInvite(db, gym, 'member', NOW).token;
  G.createInvite(db, gym, 'member', NOW);
  assert.equal(code(() => G.usableInvite(db, a, NOW)), 'invalid');
  const b = G.createInvite(db, gym, 'member', NOW).token;
  assert.equal(code(() => G.usableInvite(db, b, NOW + (G.MEMBER_CODE_DAYS + 1) * 86400000)), 'expired');
});

test('the basic plan holds three trainers', () => {
  const db = fresh();
  const gym = G.setGym(db, user(db, 'owner'), { name: 'G', plan: 'basic' }, NOW);
  for (let i = 0; i < 3; i++) G.createInvite(db, gym, 'trainer', NOW);
  assert.equal(code(() => G.createInvite(db, gym, 'trainer', NOW)), 'limit');
});

test('the owner assigns a member to a staff trainer, and can move them', () => {
  const { db, gym } = setup();
  G.assign(db, gym, 'm1', 'ana', NOW);
  assert.equal(T.linkOf(db, 'm1').trainerId, 'ana');
  G.assign(db, gym, 'm1', 'luis', NOW);
  assert.equal(T.linkOf(db, 'm1').trainerId, 'luis');
  assert.equal(db.links.filter(l => l.clientId === 'm1').length, 1);
  // the trainer reads the member like any client
  assert.doesNotThrow(() => T.assertCanRead(db, user(db, 'luis'), 'm1'));
});

test('the gym cannot assign to an outside trainer or take a client from one', () => {
  const { db, gym } = setup();
  assert.equal(code(() => G.assign(db, gym, 'm1', 'out', NOW)), 'not_staff');
  db.links.push({ trainerId: 'out', clientId: 'm2', created: '2026-01-01' });
  assert.equal(code(() => G.assign(db, gym, 'm2', 'ana', NOW)), 'has_trainer');
  assert.equal(code(() => G.assign(db, gym, 'nobody', 'ana', NOW)), 'not_member');
});

test('a full trainer takes nobody else', () => {
  const { db, gym } = setup();
  T.setTrainer(user(db, 'luis'), 'free');   // one seat
  G.assign(db, gym, 'm1', 'luis', NOW);
  assert.equal(code(() => G.assign(db, gym, 'm2', 'luis', NOW)), 'no_room');
});

test('automatic assignment spreads members by load and respects shifts', () => {
  const { db, gym } = setup({ ana: 'morning', luis: 'evening', m1: 'morning', m2: 'morning', m3: 'evening' });
  const r = G.autoAssign(db, gym, NOW);
  assert.deepEqual(r, { assigned: 4, left: 0 });
  assert.equal(T.linkOf(db, 'm1').trainerId, 'ana');
  assert.equal(T.linkOf(db, 'm2').trainerId, 'ana');
  assert.equal(T.linkOf(db, 'm3').trainerId, 'luis');
  // m4 has no shift: goes to whoever is lighter relative to seats (luis: 1/5 vs ana: 2/50)
  assert.equal(T.linkOf(db, 'm4').trainerId, 'ana');
});

test('automatic assignment reports members it could not place', () => {
  const { db, gym } = setup();
  T.setTrainer(user(db, 'luis'), 'free');
  user(db, 'ana').disabled = true;
  assert.deepEqual(G.autoAssign(db, gym, NOW), { assigned: 1, left: 3 });
});

test('removing a trainer returns their gym members to the list and takes the gym role away', () => {
  const { db, gym } = setup();
  G.assign(db, gym, 'm1', 'ana', NOW);
  G.removeStaff(db, gym, 'ana');
  assert.equal(T.linkOf(db, 'm1'), null);
  assert.equal(user(db, 'ana').trainer, undefined);
  // Luis was a trainer before: he keeps his own role
  G.removeStaff(db, gym, 'luis');
  assert.equal(user(db, 'luis').trainer.plan, 'silver');
});

test('a member who leaves loses the gym trainer but not an outside one', () => {
  const { db, gym } = setup();
  G.assign(db, gym, 'm1', 'ana', NOW);
  G.leave(db, 'm1');
  assert.equal(T.linkOf(db, 'm1'), null);
  db.links.push({ trainerId: 'out', clientId: 'm2', created: '2026-01-01' });
  G.leave(db, 'm2');
  assert.equal(T.linkOf(db, 'm2').trainerId, 'out');
  assert.equal(G.roleOf(db, user(db, 'm2')), null);
});

test('the owner overview shows load and activity, not personal data', () => {
  const { db, gym } = setup();
  G.assign(db, gym, 'm1', 'ana', NOW);
  const v = G.overview(db, gym, id => (id === 'm1' ? { code: 'inactive', days: 5, last: '2026-10-15' } : null), NOW);
  assert.equal(v.trainers.find(t => t.id === 'ana').members, 1);
  const m1 = v.members.find(m => m.id === 'm1');
  assert.equal(m1.trainerName, 'Ana');
  assert.equal(m1.status.code, 'inactive');
  assert.deepEqual(Object.keys(m1).sort(), ['id', 'name', 'outside', 'shift', 'since', 'status', 'trainerId', 'trainerName']);
  assert.equal(v.members.filter(m => !m.trainerId).length, 3);
});

test('closing a gym lets everyone go', () => {
  const { db, gym } = setup();
  G.assign(db, gym, 'm1', 'ana', NOW);
  G.setGym(db, user(db, 'owner'), { plan: null });
  assert.equal(db.gyms.length, 0);
  assert.equal(db.gymMembers.length, 0);
  assert.equal(T.linkOf(db, 'm1'), null);
  assert.equal(user(db, 'ana').trainer, undefined);
});

test('a gym colour scheme reaches everyone in it, and only known colours are stored', () => {
  const { db, gym } = setup();
  G.setGym(db, user(db, 'owner'), { name: 'Humboldt Fitness Club (HFC)', plan: 'basic', brand: { accent: 'red', theme: 'dark' } });
  assert.deepEqual(gym.brand, { accent: 'red', theme: 'dark' });
  for (const id of ['owner', 'ana', 'm1']) assert.deepEqual(G.roleOf(db, user(db, id)).brand, { accent: 'red', theme: 'dark' }, id);
  G.setGym(db, user(db, 'owner'), { plan: 'basic' });
  assert.deepEqual(gym.brand, { accent: 'red', theme: 'dark' }, 'no brand given keeps it');
  G.setGym(db, user(db, 'owner'), { plan: 'basic', brand: { accent: 'url(x)', theme: '__proto__' } });
  assert.equal(gym.brand, null);
});

test('the owner can train at their own gym, keeping their own trainer plan', () => {
  const { db, gym } = setup();
  T.setTrainer(user(db, 'owner'), 'silver');
  G.addOwnerAsStaff(db, gym, user(db, 'owner'), { shift: 'evening' });
  assert.equal(user(db, 'owner').trainer.plan, 'silver');
  assert.equal(G.roleOf(db, user(db, 'owner')).role, 'owner');
  G.assign(db, gym, 'm1', 'owner');
  assert.equal(T.linkOf(db, 'm1').trainerId, 'owner');
  assert.equal(code(() => G.addOwnerAsStaff(db, gym, user(db, 'owner'))), 'has_gym');
  assert.equal(code(() => G.addOwnerAsStaff(db, gym, user(db, 'ana'))), 'not_owner');
});

test('a client of a staff trainer who joins as a member counts as a gym member of that trainer', () => {
  const db = fresh();
  const gym = G.setGym(db, user(db, 'owner'), { name: 'G', plan: 'basic' });
  T.setTrainer(user(db, 'owner'), 'silver');
  db.links.push({ trainerId: 'owner', clientId: 'm1', created: '2026-01-01' });
  G.addOwnerAsStaff(db, gym, user(db, 'owner'));
  G.join(db, user(db, 'm1'), G.createInvite(db, gym, 'member').token);
  const v = G.overview(db, gym, () => null);
  assert.equal(v.members[0].trainerId, 'owner');
  assert.equal(v.trainers[0].members, 1);
});
