import test from 'node:test';
import assert from 'node:assert/strict';
import * as V from '../trainer/visits.js';
import * as RT from '../trainer/retention.js';

const NOW = Date.parse('2026-11-11T15:00:00Z');

test('visits: one per day, the member\'s own day within a day of the server, no past or future', () => {
  const f = {};
  assert.equal(V.addVisit(f, 'm1', '2026-11-11'), true);
  assert.equal(V.addVisit(f, 'm1', '2026-11-11'), false, 'twice the same day counts once');
  V.addVisit(f, 'm1', '2026-11-09');
  assert.deepEqual(V.visitsOf(f, 'm1'), ['2026-11-09', '2026-11-11']);
  assert.equal(V.countSince(f, 'm1', '2026-11-10'), 1);
  assert.deepEqual(V.presentOn(f, '2026-11-11'), ['m1']);
  assert.equal(V.visitDay('2026-11-10', NOW), '2026-11-10', 'late evening in Caracas is still yesterday there');
  assert.equal(V.visitDay('2026-10-01', NOW), '2026-11-11', 'no back-dating');
  assert.equal(V.visitDay('2027-01-01', NOW), '2026-11-11', 'no future');
  assert.equal(V.visitDay('nonsense', NOW), '2026-11-11');
  assert.throws(() => V.addVisit(f, 'm1', 'x'), V.VisitError);
  for (let i = 0; i < V.KEEP_DAYS + 20; i++) V.addVisit(f, 'm2', new Date(NOW - i * 86400000).toISOString().slice(0, 10));
  assert.equal(V.visitsOf(f, 'm2').length, V.KEEP_DAYS);
  assert.equal(V.forget(f, 'm2'), true);
  assert.deepEqual(V.visitsOf(f, 'm2'), []);
});

test('retention: an episode opens when a member turns inactive and closes as recovered, lost or left', () => {
  const f = {};
  const st = code => ({ code });
  // day 1: m1 and m2 slip away, m3 is fine
  assert.equal(RT.track(f, [{ id: 'm1', trainerId: 't1', status: st('inactive') }, { id: 'm2', trainerId: 't2', status: st('inactive') }, { id: 'm3', trainerId: 't1', status: st('ok') }], '2026-11-02'), true);
  assert.equal(f.episodes.filter(e => !e.end).length, 2);
  assert.equal(RT.track(f, [{ id: 'm1', trainerId: 't1', status: st('inactive') }, { id: 'm2', trainerId: 't2', status: st('inactive') }, { id: 'm3', status: st('ok') }], '2026-11-03'), false, 'nothing new, nothing saved');
  // m1 comes back; m2 leaves the gym
  RT.track(f, [{ id: 'm1', trainerId: 't1', status: st('ok') }, { id: 'm3', status: st('ok') }], '2026-11-09');
  const r = RT.report(f, '2026-11');
  assert.equal(r.flagged, 2);
  assert.deepEqual(r.recovered.map(x => [x.userId, x.trainerId, x.days]), [['m1', 't1', 7]]);
  assert.equal(r.open.length, 0);
  assert.equal(f.episodes.find(e => e.userId === 'm2').outcome, 'left');
  // m3 turns inactive and never returns: lost after the window
  RT.track(f, [{ id: 'm3', status: st('inactive') }], '2026-11-10');
  RT.track(f, [{ id: 'm3', status: st('inactive') }], '2026-12-15');
  assert.equal(RT.report(f, '2026-12').lost, 1);
  // a member with no activity ever is not 'recovered' when the episode would close
  RT.track(f, [{ id: 'm4', status: st('inactive') }], '2026-12-16');
  RT.track(f, [{ id: 'm4', status: st('new') }], '2026-12-17');
  assert.equal(f.episodes.find(e => e.userId === 'm4').end, null);
});
