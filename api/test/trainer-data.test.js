import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../trainer/records.js';
import * as C from '../trainer/chat.js';
import * as K from '../trainer/content.js';
import * as T from '../trainer/logic.js';

const NOW = Date.parse('2026-10-20T12:00:00Z');
const client = { id: 'c1', role: 'client' }, trainer = { id: 't1', role: 'trainer' };
const err = fn => { try { fn(); } catch (e) { return e.message; } return null; };

/* ---------------- records ---------------- */

test('a record keeps only the fields its kind allows, rounded', () => {
  const e = R.makeEntry({ kind: 'measures', d: '2026-10-19', v: { waist: 88.24, hip: '' , evil: 1 } }, client, NOW);
  assert.deepEqual(e.v, { waist: 88.2 });
  assert.equal(e.by, 'c1');
  assert.equal(e.role, 'client');
});

test('records refuse unknown kinds, bad dates, out-of-range and empty values', () => {
  assert.match(err(() => R.makeEntry({ kind: 'bmi', d: '2026-10-19', v: { x: 1 } }, client, NOW)), /unknown/);
  assert.match(err(() => R.makeEntry({ kind: 'weight', d: '19/10/2026', v: { kg: 80 } }, client, NOW)), /date/);
  assert.match(err(() => R.makeEntry({ kind: 'weight', d: '2026-12-31', v: { kg: 80 } }, client, NOW)), /future/);
  assert.match(err(() => R.makeEntry({ kind: 'weight', d: '2026-10-19', v: { kg: 900 } }, client, NOW)), /between/);
  assert.match(err(() => R.makeEntry({ kind: 'steps', d: '2026-10-19', v: {} }, client, NOW)), /at least one/);
  assert.match(err(() => R.makeEntry({ kind: 'meal', d: '2026-10-19', v: { meal: 'lunch', text: ' ' } }, client, NOW)), /describe/);
});

test('only whoever logged a record can delete it', () => {
  const file = {};
  const mine = R.addEntry(file, R.makeEntry({ kind: 'weight', d: '2026-10-19', v: { kg: 80 } }, trainer, NOW));
  assert.match(err(() => R.removeEntry(file, mine.id, 'c1')), /only whoever/);
  R.removeEntry(file, mine.id, 't1');
  assert.equal(file.entries.length, 0);
});

test('weight merges the app log with records; a record wins on the same day', () => {
  const bw = [{ d: '2026-10-01', w: 80 }, { d: '2026-10-10', w: 79 }];
  const entries = [R.makeEntry({ kind: 'weight', d: '2026-10-10', v: { kg: 78.6 } }, trainer, NOW),
    R.makeEntry({ kind: 'weight', d: '2026-10-15', v: { kg: 78 } }, client, NOW)];
  assert.deepEqual(R.weightSeries(bw, entries).map(x => [x.d, x.w, x.src]),
    [['2026-10-01', 80, 'app'], ['2026-10-10', 78.6, 'trainer'], ['2026-10-15', 78, 'client']]);
});

test('measures carry forward and the table shows first and latest per zone', () => {
  const e = [R.makeEntry({ kind: 'measures', d: '2026-09-01', v: { waist: 96, arm: 35 } }, client, NOW),
    R.makeEntry({ kind: 'measures', d: '2026-10-01', v: { waist: 90 } }, trainer, NOW)];
  assert.deepEqual(R.series(e, 'measures')[1], { waist: 90, arm: 35, d: '2026-10-01' });
  assert.deepEqual(R.measureTable(e).waist, { first: 96, last: 90, d: '2026-10-01' });
  assert.equal(R.measureTable(e).arm.first, 35);
});

test('the week summary averages steps and sleep and counts meals', () => {
  const mk = (kind, d, v) => R.makeEntry({ kind, d, v }, client, NOW);
  const e = [mk('steps', '2026-10-20', { n: 8000 }), mk('steps', '2026-10-18', { n: 6000 }), mk('steps', '2026-10-01', { n: 99999 }),
    mk('sleep', '2026-10-19', { h: 7.5 }), mk('meal', '2026-10-20', { meal: 'lunch', text: 'arroz' })];
  // "arroz" with no amount is one typical serving (150 g), estimated, so the day has macros
  assert.deepEqual(R.weekSummary(e, '2026-10-20'), { steps: 7000, sleep: 7.5, meals: 1, macros: { kcal: 195, protein: 4, carbs: 42, fat: 0 }, macroDays: 1 });
});

/* ---------------- status ---------------- */

test('status: inactive after three idle days, stalled on a flat weight, otherwise fine', () => {
  assert.equal(T.clientStatus({ workouts: [{ d: '2026-10-16' }] }, NOW).code, 'inactive');
  assert.equal(T.clientStatus({ workouts: [{ d: '2026-10-16' }] }, NOW).days, 4);
  const flat = [{ d: '2026-10-05', w: 70 }, { d: '2026-10-12', w: 70.1 }, { d: '2026-10-19', w: 70.2 }];
  assert.equal(T.clientStatus({ weights: flat }, NOW).code, 'stalled');
  assert.equal(T.clientStatus({ weights: [...flat.slice(0, 2), { d: '2026-10-19', w: 69 }] }, NOW).code, 'ok');
  assert.equal(T.clientStatus({}, NOW).code, 'new');
});

test('loads keep the latest top set, the best ever and one point per session', () => {
  const S = { workouts: [
    { d: '2026-10-01', entries: [{ id: 'sq', sets: [{ w: 60, r: 8, done: true }, { w: 65, r: 5, done: true }] }] },
    { d: '2026-10-08', entries: [{ id: 'sq', sets: [{ w: 62.5, r: 8, done: true }, { w: 90, r: 1, done: false }] }] }
  ] };
  const [sq] = T.loads(S);
  assert.deepEqual(sq.last, { w: 62.5, r: 8, d: '2026-10-08' });
  assert.equal(sq.best, 65);
  assert.deepEqual(sq.history.map(h => h.w), [65, 62.5]);
});

test('adherence counts the last four weeks against the weekly plan', () => {
  const S = { week: { 1: 'a', 3: 'b', 5: 'c' }, workouts: Array.from({ length: 6 }, (_, i) => ({ d: `2026-10-${String(19 - i * 3).padStart(2, '0')}` })) };
  const a = T.adherence(S, NOW);
  assert.equal(a.plan, 3);
  assert.equal(a.pct, Math.round(6 / 12 * 100));
});

/* ---------------- chat ---------------- */

test('chat tracks unread per reader, and your own message is never unread for you', () => {
  const f = {};
  C.addMessage(f, 't1', 'Hola María', NOW);
  C.addMessage(f, 't1', '¿Cómo vas?', NOW + 1000);
  assert.equal(C.unreadFor(f, 'c1'), 2);
  assert.equal(C.unreadFor(f, 't1'), 0);
  C.markRead(f, 'c1', NOW + 2000);
  assert.equal(C.unreadFor(f, 'c1'), 0);
  C.addMessage(f, 'c1', 'Bien', NOW + 3000);
  assert.equal(C.unreadFor(f, 't1'), 1);
});

test('chat refuses empty and oversized messages', () => {
  assert.match(err(() => C.addMessage({}, 't1', '   ')), /write/);
  assert.match(err(() => C.addMessage({}, 't1', 'x'.repeat(C.MAX_TEXT + 1))), /limited/);
});

/* ---------------- content ---------------- */

const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

test('a post needs a title and something in it', () => {
  assert.match(err(() => K.makePost({ title: '' })), /title/);
  assert.match(err(() => K.makePost({ title: 'Semana 1' })), /text, a link or a file/);
  assert.ok(K.makePost({ title: 'Semana 1', body: 'Rutina nueva' }).post.id);
});

test('uploads must be an allowed type whose bytes match it', () => {
  assert.ok(K.makePost({ title: 'Foto', file: { name: 'a.png', type: 'image/png', data: png.toString('base64') } }).bytes);
  assert.match(err(() => K.makePost({ title: 'X', file: { name: 'a.mp4', type: 'video/mp4', data: 'AAAA' } })), /link/);
  assert.match(err(() => K.makePost({ title: 'X', file: { name: 'a.png', type: 'image/png', data: Buffer.from('MZ fake').toString('base64') } })), /does not match/);
});

test('links must be http(s)', () => {
  assert.match(err(() => K.makePost({ title: 'X', link: 'javascript:alert(1)' })), /https/);
  assert.ok(K.makePost({ title: 'Video', link: 'https://youtu.be/abc' }).post.link);
});

test('the public post shape carries no server path', () => {
  const { post } = K.makePost({ title: 'Foto', file: { name: '../../etc/passwd.png', type: 'image/png', data: png.toString('base64') } });
  assert.equal(post.file.name.includes('/'), false);
  assert.deepEqual(Object.keys(K.publicPost(post).file), ['name', 'type', 'size']);
});

/* ---------------- assigned workouts ---------------- */
import * as A from '../trainer/assign.js';

const WO = { date: '2026-10-21', name: 'Torso: empuje', note: 'Baja lento', ex: [{ id: '0025', sets: 3, repsMin: 6, reps: 8 }] };

test('an assignment keeps its exercises and rep range', () => {
  const a = A.makeAssignment(WO, 't1', NOW);
  assert.deepEqual(a.ex, [{ id: '0025', mode: 'reps', sets: 3, reps: 8, repsMin: 6 }]);
  assert.equal(a.by, 't1');
});

test('assignments refuse bad dates, names, ranges and exercise ids', () => {
  assert.match(err(() => A.makeAssignment({ ...WO, date: '2026-10-01' }, 't1', NOW)), /today or a later/);
  assert.match(err(() => A.makeAssignment({ ...WO, name: ' ' }, 't1', NOW)), /name/);
  assert.match(err(() => A.makeAssignment({ ...WO, ex: [] }, 't1', NOW)), /at least one/);
  assert.match(err(() => A.makeAssignment({ ...WO, ex: [{ id: '0025', sets: 3, repsMin: 10, reps: 8 }] }, 't1', NOW)), /above the maximum/);
  assert.match(err(() => A.makeAssignment({ ...WO, ex: [{ id: '../x', sets: 3, reps: 8 }] }, 't1', NOW)), /not a valid exercise/);
  assert.match(err(() => A.makeAssignment({ ...WO, ex: [{ id: '0025', sets: 30, reps: 8 }] }, 't1', NOW)), /sets/);
});

test('one assignment per day: sending again replaces it', () => {
  const f = {};
  A.upsert(f, A.makeAssignment(WO, 't1', NOW));
  A.upsert(f, A.makeAssignment({ ...WO, name: 'Pierna' }, 't1', NOW));
  A.upsert(f, A.makeAssignment({ ...WO, date: '2026-10-23' }, 't1', NOW));
  assert.deepEqual(f.items.map(a => [a.date, a.name]), [['2026-10-21', 'Pierna'], ['2026-10-23', 'Torso: empuje']]);
});

test('the client sees yesterday onwards; the trainer the last weeks, newest first', () => {
  const f = { items: [{ date: '2026-09-01' }, { date: '2026-10-19' }, { date: '2026-10-20' }, { date: '2026-10-25' }] };
  assert.deepEqual(A.upcoming(f, '2026-10-21').map(a => a.date), ['2026-10-20', '2026-10-25']);
  assert.deepEqual(A.recent(f, '2026-10-21').map(a => a.date), ['2026-10-25', '2026-10-20', '2026-10-19']);
});

test('assignments reach up to two months ahead, no further', () => {
  assert.ok(A.makeAssignment({ ...WO, date: '2026-12-20' }, 't1', NOW));
  assert.match(err(() => A.makeAssignment({ ...WO, date: '2027-01-15' }, 't1', NOW)), /days ahead/);
});

test('a month plan is checked whole: one bad day sends nothing', () => {
  const days = ['2026-10-21', '2026-10-23', '2026-10-26'].map(date => ({ ...WO, date }));
  assert.equal(A.makeBatch(days, 't1', NOW).length, 3);
  assert.match(err(() => A.makeBatch([...days, { ...WO, date: '2026-10-28', ex: [] }], 't1', NOW)), /2026-10-28: add at least one/);
  assert.match(err(() => A.makeBatch([days[0], days[0]], 't1', NOW)), /same day/);
});

test('the client profile keeps only known keys', () => {
  assert.deepEqual(A.cleanProfile({ goal: 'muscle', limits: ['knee', 'knee', 'evil'], focus: 'zzz', days: '4', notes: ' x ' }),
    { macros: null, goal: 'muscle', limits: ['knee'], focus: null, days: 4, notes: 'x' });
});

test('assigned exercises carry their mode: reps with weight, time, cardio, and rest', () => {
  const a = A.makeAssignment({ ...WO, ex: [
    { id: '0025', sets: 4, repsMin: 6, reps: 8, weight: 62.5, rest: 120 },
    { id: '0276', mode: 'time', sets: 3, sec: 45 },
    { id: '0685', mode: 'cardio', sets: 6, min: 2, speed: 12, rest: 60 }
  ] }, 't1', NOW);
  assert.deepEqual(a.ex, [
    { id: '0025', mode: 'reps', sets: 4, reps: 8, repsMin: 6, weight: 62.5, rest: 120 },
    { id: '0276', mode: 'time', sets: 3, sec: 45 },
    { id: '0685', mode: 'cardio', sets: 6, min: 2, speed: 12, rest: 60 }
  ]);
  assert.match(err(() => A.makeAssignment({ ...WO, ex: [{ id: '0276', mode: 'time', sets: 3, sec: 2 }] }, 't1', NOW)), /exercise 1: seconds/);
  assert.match(err(() => A.makeAssignment({ ...WO, ex: [{ id: '0025', sets: 3, reps: 8, weight: 900 }] }, 't1', NOW)), /weight/);
});

/* ---------------- trainer profile ---------------- */

import * as P from '../trainer/profile.js';

test('a trainer profile keeps only its fields, trimmed, with empty numbers as null', () => {
  const p = P.cleanProfile({ name: ' Ana Pérez ', age: '34', years: '', story: ' Exatleta ', certifications: ['NSCA-CPT', ' ', 'NSCA-CPT', 'ISSA'], methods: ['Hipertrofia'], about: 'Hola', role: 'admin' }, NOW);
  assert.deepEqual(p, { name: 'Ana Pérez', age: 34, years: null, story: 'Exatleta', certifications: ['NSCA-CPT', 'ISSA'], methods: ['Hipertrofia'], about: 'Hola', updated: new Date(NOW).toISOString() });
});

test('a trainer profile refuses out-of-range numbers and oversized text', () => {
  assert.match(err(() => P.cleanProfile({ age: 12 })), /age must be a whole number from 18 to 99/);
  assert.match(err(() => P.cleanProfile({ years: 2.5 })), /years of experience/);
  assert.match(err(() => P.cleanProfile({ about: 'x'.repeat(P.MAX_ABOUT + 1) })), /description is limited/);
  assert.match(err(() => P.cleanProfile({ certifications: Array.from({ length: P.MAX_ITEMS + 1 }, (_, i) => 'c' + i) })), /up to 15 certifications/);
});

test('the public profile falls back to the account name', () => {
  assert.equal(P.publicProfile({ name: 'ana' }).name, 'ana');
  assert.deepEqual(P.publicProfile({ name: 'ana' }).certifications, []);
  assert.equal(P.publicProfile({ name: 'ana', trainerProfile: { name: 'Ana P.' } }).name, 'Ana P.');
});

/* ---------------- demo client ---------------- */

import { demoClient } from '../trainer/demo.js';

test('a demo client has eight weeks of data the client file can show', () => {
  const { user, state, entries } = demoClient(undefined, NOW);
  assert.match(user.id, /^demo-[0-9a-f]{10}$/);
  assert.equal(user.demo, true);
  assert.ok(state.workouts.length >= 20 && state.workouts.every(w => Date.parse(w.d) <= NOW));
  assert.equal(T.adherence(state, NOW).plan, 3);
  const goblet = T.loads(state).find(x => x.id === '1760');
  assert.ok(goblet.best > goblet.history[0].w, 'loads progress');
  const s = T.clientSummary(user, { created: user.created }, state, { entries }, NOW);
  assert.equal(s.weight, 71.8);
  assert.ok(entries.some(e => e.kind === 'meal') && entries.some(e => e.kind === 'measures'));
});

/* ---------------- nutrition: plans, macros ---------------- */

test('meals and macros come from Silver up; Free and non-trainers have none', () => {
  assert.equal(T.hasFeature({ trainer: { plan: 'free' } }, 'meals'), false);
  for (const plan of ['silver', 'gold', 'platinum']) {
    assert.equal(T.hasFeature({ trainer: { plan } }, 'meals'), true, plan);
    assert.equal(T.hasFeature({ trainer: { plan } }, 'health'), true, plan);
  }
  assert.deepEqual(T.featuresOf({ name: 'client' }), []);
  assert.deepEqual(T.featuresOf(null), []);
});

test('a meal keeps its macros, rounded, and refuses impossible ones', () => {
  const m = R.makeEntry({ kind: 'meal', d: '2026-10-19', v: { meal: 'lunch', text: 'Pollo y arroz', kcal: '650.4', protein: 42.6, carbs: '', fat: 18, evil: 1 } }, client, NOW);
  assert.deepEqual(m.v, { meal: 'lunch', text: 'Pollo y arroz', kcal: 650, protein: 43, fat: 18 });
  assert.match(err(() => R.makeEntry({ kind: 'meal', d: '2026-10-19', v: { meal: 'lunch', text: 'x', protein: 900 } }, client, NOW)), /protein must be between/);
});

test('the week summary averages macros over the days that have them', () => {
  const meal = (d, v) => R.makeEntry({ kind: 'meal', d, v: { meal: 'lunch', text: 'x', ...v } }, client, NOW);
  const e = [meal('2026-10-19', { kcal: 800, protein: 50 }), meal('2026-10-19', { kcal: 1000, protein: 40 }),
    meal('2026-10-20', { kcal: 2000, protein: 110 }), meal('2026-10-20', {})];
  const w = R.weekSummary(e, '2026-10-20');
  assert.deepEqual(w.macros, { kcal: 1900, protein: 100, carbs: null, fat: null });
  assert.equal(w.macroDays, 2);
});

test('the daily macro goal keeps sensible numbers and drops the rest', () => {
  assert.deepEqual(A.cleanMacros({ kcal: '2200', protein: 150, carbs: 'x', fat: 70 }), { kcal: 2200, protein: 150, carbs: null, fat: 70 });
  assert.equal(A.cleanMacros({ kcal: 100 }), null, 'below 500 kcal is not a goal');
  assert.equal(A.cleanMacros(null), null);
});
