/* Trainer ↔ client links (Trainnery).
 *
 * Pure functions over the db object server.js keeps in memory — no I/O here, so every rule can
 * be tested against a plain object. Shapes added to db.json:
 *
 *   users[].trainer      { plan: 'free' | 'silver' | 'gold' | 'platinum', since }   set by an admin; absent = not a trainer
 *   links[]              { trainerId, clientId, created }     one trainer per client
 *   trainerInvites[]     { token, trainerId, created, usedBy?, usedAt? }
 *
 * The client's own state file is never written from here: a trainer only ever reads it.
 */
import crypto from 'node:crypto';
import * as R from './records.js';

export const PLAN_LIMITS = { free: 1, silver: 5, gold: 25, platinum: 50 };
// What a plan unlocks besides seats. From Silver up: the meal log with macros and a daily macro
// goal, and health data from Apple Health / Health Connect. A client gets their trainer's.
const NUTRITION = ['meals', 'macros', 'health'];
export const PLAN_FEATURES = { free: [], silver: NUTRITION, gold: NUTRITION, platinum: NUTRITION };
export const INVITE_DAYS = 14;

export class TrainerError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
// What the user sees for each refusal, and the status it travels with.
export const HTTP_FOR = { not_trainer: 403, not_linked: 403, limit: 409, has_trainer: 409, self: 400, invalid: 404, expired: 410, used: 409 };

export function ensureShape(db) {
  db.links = db.links || [];
  db.trainerInvites = db.trainerInvites || [];
  return db;
}

export const isTrainer = user => !!user?.trainer;
export const planOf = user => (PLAN_LIMITS[user?.trainer?.plan] ? user.trainer.plan : 'free');
export const limitOf = user => PLAN_LIMITS[planOf(user)];
export const featuresOf = user => (isTrainer(user) ? PLAN_FEATURES[planOf(user)] : []);
export const hasFeature = (user, f) => featuresOf(user).includes(f);
export const clientIdsOf = (db, trainerId) => db.links.filter(l => l.trainerId === trainerId).map(l => l.clientId);
export const linkOf = (db, clientId) => db.links.find(l => l.clientId === clientId) || null;
export const isLinked = (db, trainerId, clientId) => db.links.some(l => l.trainerId === trainerId && l.clientId === clientId);

/** Seats in use count open invites too, so a free trainer can't hand out ten links for one seat. */
export function seatsUsed(db, trainerId, now = Date.now()) {
  return clientIdsOf(db, trainerId).length + openInvites(db, trainerId, now).length;
}

export function openInvites(db, trainerId, now = Date.now()) {
  return db.trainerInvites.filter(i => i.trainerId === trainerId && !i.usedBy && !isExpired(i, now));
}

const isExpired = (inv, now) => now - Date.parse(inv.created) > INVITE_DAYS * 86400000;

export function setTrainer(user, plan) {
  if (!plan) { delete user.trainer; return user; }
  if (!PLAN_LIMITS[plan]) throw new TrainerError('invalid', 'unknown plan');
  user.trainer = { plan, since: user.trainer?.since || new Date().toISOString() };
  return user;
}

export function createInvite(db, trainer, now = Date.now()) {
  if (!isTrainer(trainer)) throw new TrainerError('not_trainer', 'this account is not a trainer');
  if (seatsUsed(db, trainer.id, now) >= limitOf(trainer))
    throw new TrainerError('limit', 'your plan is full — remove a client or an open invite first');
  let token;
  // 128 bits, made here and never by the browser: the link is the whole credential.
  do { token = crypto.randomBytes(16).toString('hex'); } while (db.trainerInvites.some(i => i.token === token));
  const invite = { token, trainerId: trainer.id, created: new Date(now).toISOString() };
  db.trainerInvites.push(invite);
  return invite;
}

/** An invite someone may still use — the one check shared by signup and acceptance. */
export function usableInvite(db, token, now = Date.now()) {
  const inv = db.trainerInvites.find(i => i.token === String(token || '').toLowerCase());
  if (!inv) throw new TrainerError('invalid', 'this invite link does not exist');
  if (inv.usedBy) throw new TrainerError('used', 'this invite link was already used');
  if (isExpired(inv, now)) throw new TrainerError('expired', 'this invite link has expired — ask your trainer for a new one');
  const trainer = db.users.find(u => u.id === inv.trainerId);
  if (!trainer || trainer.disabled || !isTrainer(trainer)) throw new TrainerError('invalid', 'this invite link is no longer valid');
  return { inv, trainer };
}

export function acceptInvite(db, client, token, now = Date.now()) {
  const { inv, trainer } = usableInvite(db, token, now);
  if (trainer.id === client.id) throw new TrainerError('self', 'you cannot be your own client');
  const current = linkOf(db, client.id);
  if (current) throw new TrainerError('has_trainer', current.trainerId === trainer.id
    ? 'you are already this trainer\'s client'
    : 'you already have a trainer — leave them first');
  // The invite already holds its seat, so the limit cannot be exceeded here even if the plan
  // shrank since it was made; refuse anyway rather than overfill a downgraded plan.
  if (clientIdsOf(db, trainer.id).length >= limitOf(trainer))
    throw new TrainerError('limit', 'this trainer has no free seats right now');
  const link = { trainerId: trainer.id, clientId: client.id, created: new Date(now).toISOString() };
  db.links.push(link);
  inv.usedBy = client.id;
  inv.usedAt = link.created;
  return { link, trainer };
}

export function revokeInvite(db, trainer, token) {
  const before = db.trainerInvites.length;
  db.trainerInvites = db.trainerInvites.filter(i => !(i.token === token && i.trainerId === trainer.id && !i.usedBy));
  if (db.trainerInvites.length === before) throw new TrainerError('invalid', 'no such open invite');
}

export function unlink(db, trainerId, clientId) {
  if (!isLinked(db, trainerId, clientId)) throw new TrainerError('not_linked', 'this person is not your client');
  db.links = db.links.filter(l => !(l.trainerId === trainerId && l.clientId === clientId));
}

/** Read access: a trainer sees a client's state only while the link exists. */
export function assertCanRead(db, trainer, clientId) {
  if (!isTrainer(trainer)) throw new TrainerError('not_trainer', 'this account is not a trainer');
  if (!isLinked(db, trainer.id, clientId)) throw new TrainerError('not_linked', 'this person is not your client');
}

const daysAgo = (iso, now) => Math.floor((now - Date.parse(iso)) / 86400000);
const isoDay = ms => new Date(ms).toISOString().slice(0, 10);
export const INACTIVE_DAYS = 3;

/** How the client is doing, as the list shows it: inactive beats stalled beats fine.
 *  - inactive: nothing logged (workout, weigh-in, record) for INACTIVE_DAYS or more
 *  - stalled:  the last three weigh-ins sit within 0.3 kg of each other */
export function clientStatus({ workouts, weights, entries }, now = Date.now()) {
  const days = [
    ...(workouts || []).map(w => w.d), ...(weights || []).map(w => w.d), ...(entries || []).map(e => e.d)
  ].filter(Boolean).sort();
  const last = days[days.length - 1] || null;
  if (!last) return { code: 'new', days: null, last: null };
  const idle = daysAgo(last, Date.parse(isoDay(now)));
  if (idle >= INACTIVE_DAYS) return { code: 'inactive', days: idle, last };
  const w = (weights || []).slice(-3).map(x => x.w);
  if (w.length === 3 && Math.max(...w) - Math.min(...w) < 0.3) return { code: 'stalled', days: idle, last };
  return { code: 'ok', days: idle, last };
}

/** Planned training days per week, from the client's weekly plan. */
const plannedPerWeek = S => Object.values(S.week || {}).filter(Boolean).length;

/** Share of planned sessions done over the last four weeks, and full weeks in a row on plan. */
export function adherence(S, now = Date.now()) {
  const plan = plannedPerWeek(S);
  const ws = (S.workouts || []).filter(w => w.d);
  const recent = ws.filter(w => daysAgo(w.d, now) < 28).length;
  const pct = plan ? Math.min(100, Math.round(recent / (plan * 4) * 100)) : null;
  let streak = 0;
  if (plan) {
    for (let k = 1; k <= 52; k++) {   // completed weeks only: this one is still running
      const n = ws.filter(w => { const a = daysAgo(w.d, now); return a >= 7 * k && a < 7 * k + 7; }).length;
      if (n >= plan) streak++; else break;
    }
  }
  const thisWeek = ws.filter(w => daysAgo(w.d, now) < 7).length;
  return { pct, streak, thisWeek, plan };
}

/** Per exercise: the heaviest done set of the latest session, the best ever, and the series of
 *  per-session maxima the chart draws. Exercise ids only; the app turns them into names. */
export function loads(S) {
  const out = {};
  for (const w of (S.workouts || []).filter(x => x.d)) {
    for (const e of w.entries || []) {
      const done = (e.sets || []).filter(s => s.done && Number(s.w) > 0);
      if (!done.length) continue;
      const top = done.reduce((a, b) => (b.w > a.w || (b.w === a.w && b.r > a.r) ? b : a));
      const x = out[e.id] || (out[e.id] = { id: e.id, last: null, best: 0, history: [] });
      x.last = { w: top.w, r: top.r, d: w.d };
      x.best = Math.max(x.best, top.w);
      x.history.push({ d: w.d, w: top.w });
    }
  }
  return Object.values(out).sort((a, b) => b.last.d.localeCompare(a.last.d));
}

/** Recent activity as the trainer's feed shows it: sessions and records, newest first. */
export function activity(S, entries, limit = 30) {
  const items = [
    ...(S.workouts || []).filter(w => w.d).map(w => ({
      type: 'workout', d: w.d, at: w.end ? new Date(w.end).toISOString() : w.d, name: w.name,
      sets: (w.entries || []).reduce((n, e) => n + (e.sets || []).filter(s => s.done).length, 0),
      mins: w.end && w.start ? Math.round((w.end - w.start) / 60000) : null, prs: (w.prs || []).length
    })),
    ...(entries || []).map(e => ({ type: 'record', kind: e.kind, d: e.d, at: e.at, v: e.v, role: e.role, id: e.id }))
  ];
  // by the day it happened, not when it was typed in: a measurement from September logged
  // today belongs below last week's workouts
  return items.sort((a, b) => b.d.localeCompare(a.d) || String(b.at).localeCompare(String(a.at))).slice(0, limit);
}

/** One row of the trainer's client list. `rec` is the client's records file (or null). */
export function clientSummary(user, link, S, rec = null, now = Date.now()) {
  S = S || {};
  const entries = rec?.entries || [];
  const workouts = S.workouts || [];
  const weights = R.weightSeries(S.bodyweight, entries);
  const last = workouts[workouts.length - 1];
  const lastW = weights[weights.length - 1];
  return {
    id: user.id, name: user.name, since: link.created,
    unit: S.unit || 'kg',
    workouts: workouts.length,
    last30: workouts.filter(w => w.d && daysAgo(w.d, now) < 30).length,
    lastWorkout: last ? last.d : null,
    weight: lastW ? lastW.w : null,
    weightDate: lastW ? lastW.d : null,
    status: clientStatus({ workouts, weights, entries }, now),
    lastSync: S._ts || null
  };
}

/** The client file a trainer opens: progress, history, records and plan — nothing device- or
 *  Coach-private. */
export function clientDetail(user, link, S, rec = null, now = Date.now()) {
  S = S || {};
  const entries = rec?.entries || [];
  const weights = R.weightSeries(S.bodyweight, entries);
  return {
    ...clientSummary(user, link, S, rec, now),
    targetW: S.targetW ?? null,
    weights,
    fat: R.series(entries, 'fat'),
    measures: R.series(entries, 'measures'),
    measureTable: R.measureTable(entries),
    week: R.weekSummary(entries, isoDay(now)),
    adherence: adherence(S, now),
    loads: loads(S),
    activity: activity(S, entries),
    records: R.latest(entries, 200),
    // the client's own routines, with their exercises so the trainer can start an assigned
    // workout from one; routines the app made from earlier assignments (tr-…) are left out
    routines: (S.routines || []).filter(r => !String(r.id).startsWith('tr-')).map(r => ({
      id: r.id, name: r.name, emoji: r.emoji, count: (r.ex || []).length,
      ex: (r.ex || []).filter(e => (e.mode || 'reps') === 'reps').map(e => ({ id: e.id, sets: e.sets || 3, reps: e.reps || 10, repsMin: e.repsMin || 0 }))
    })),
    plan: S.week || {},
    customEx: (S.customEx || []).map(e => ({ id: e.id, name: e.name })),
    // the sessions themselves, newest first; 60 is a couple of months for someone training
    // most days — enough to read, small enough to send
    history: (S.workouts || []).slice(-60).reverse()
  };
}
