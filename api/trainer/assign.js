/* Workouts a trainer assigns to a client for a given day (Trainnery).
 *
 *   assign-<clientId>.json   { items: [{ id, date, name, note, ex: [{ id, sets, repsMin, reps }], by, sentAt }] }
 *
 * One assignment per day: sending again for the same date replaces it. The client's app turns
 * each one into an ordinary routine on that day (double progression over the rep range), so
 * the guided workout, the suggested weights and the log all work the way they always did.
 * Exercise ids are not checked against the library here — that lives in the app — only their
 * shape.
 */
import crypto from 'node:crypto';

export const MAX_EX = 20;
export const AHEAD_DAYS = 62;            // a month's plan, sent at the end of the month before
export const MAX_BATCH = 62;
export const KEEP = 120;                 // oldest assignments drop off past this
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const EX_ID = /^[A-Za-z0-9_-]{1,40}$/;

export class AssignError extends Error {}

const int = (v, lo, hi, what) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) throw new AssignError(`${what} must be a whole number from ${lo} to ${hi}`);
  return n;
};

export function makeAssignment({ date, name, note, ex }, trainerId, now = Date.now()) {
  if (!ISO_DAY.test(String(date || '')) || isNaN(Date.parse(date))) throw new AssignError('a valid date is required');
  if (Date.parse(date) < now - 2 * 86400000) throw new AssignError('pick today or a later day');
  if (Date.parse(date) > now + AHEAD_DAYS * 86400000) throw new AssignError(`workouts can be assigned up to ${AHEAD_DAYS} days ahead`);
  name = String(name || '').trim().slice(0, 40);
  if (!name) throw new AssignError('give the workout a name');
  note = String(note || '').trim().slice(0, 300);
  if (!Array.isArray(ex) || !ex.length) throw new AssignError('add at least one exercise');
  if (ex.length > MAX_EX) throw new AssignError(`up to ${MAX_EX} exercises per workout`);
  const items = ex.map((e, i) => {
    try { return cleanItem(e); }
    catch (err) { throw new AssignError(`exercise ${i + 1}: ${err.message}`); }
  });
  return { id: crypto.randomBytes(8).toString('hex'), date, name, note, ex: items, by: trainerId, sentAt: new Date(now).toISOString() };
}

const num = (v, lo, hi, what, step = 0.5) => {
  const n = Math.round(Number(v) / step) * step;
  if (!Number.isFinite(n) || n < lo || n > hi) throw new AssignError(`${what} must be from ${lo} to ${hi}`);
  return n;
};

/** One exercise as the app logs it: reps (a rep range and an optional starting weight), time
 *  (seconds held, optionally loaded) or cardio (minutes, optional speed). `rest` is the pause
 *  after it, in seconds; absent means the client's own default. */
export function cleanItem(e) {
  if (!e || !EX_ID.test(String(e.id || ''))) throw new AssignError('not a valid exercise');
  const mode = ['reps', 'time', 'cardio'].includes(e.mode) ? e.mode : 'reps';
  const out = { id: String(e.id), mode };
  if (mode === 'reps') {
    out.sets = int(e.sets, 1, 10, 'sets');
    out.reps = int(e.reps, 1, 50, 'reps');
    out.repsMin = int(e.repsMin ?? out.reps, 1, 50, 'minimum reps');
    if (out.repsMin > out.reps) throw new AssignError('the minimum reps are above the maximum');
  } else if (mode === 'time') {
    out.sets = int(e.sets, 1, 10, 'sets');
    out.sec = int(e.sec, 5, 1800, 'seconds');
  } else {
    out.sets = int(e.sets ?? 1, 1, 20, 'rounds');
    out.min = num(e.min, 0.5, 180, 'minutes');
    if (e.speed) out.speed = num(e.speed, 0, 40, 'speed');
  }
  if (mode !== 'cardio' && e.weight) out.weight = num(e.weight, 0, 500, 'weight', 0.25);
  if (e.rest) out.rest = int(e.rest, 0, 900, 'rest');
  return out;
}

/** Puts `a` on its day, replacing whatever was assigned for that date. */
export function upsert(file, a) {
  file.items = (file.items || []).filter(x => x.date !== a.date);
  file.items.push(a);
  file.items.sort((x, y) => x.date.localeCompare(y.date));
  if (file.items.length > KEEP) file.items = file.items.slice(-KEEP);
  return a;
}

export function remove(file, id) {
  const before = (file.items || []).length;
  file.items = (file.items || []).filter(x => x.id !== id);
  if (file.items.length === before) throw new AssignError('no such assignment');
}

/** What a client's app needs: yesterday onwards (so a late-night session still finds it). */
export function upcoming(file, today) {
  const from = new Date(Date.parse(today) - 86400000).toISOString().slice(0, 10);
  return (file.items || []).filter(x => x.date >= from);
}

/** For the trainer: the last few weeks and everything ahead, newest day first. */
export function recent(file, today, days = 28) {
  const from = new Date(Date.parse(today) - days * 86400000).toISOString().slice(0, 10);
  return (file.items || []).filter(x => x.date >= from).slice().reverse();
}

/** A whole plan at once (a model laid over a month): every item is checked before any is
 *  stored, so a bad day never leaves half a month sent. */
export function makeBatch(items, trainerId, now = Date.now()) {
  if (!Array.isArray(items) || !items.length) throw new AssignError('the plan has no workouts');
  if (items.length > MAX_BATCH) throw new AssignError(`up to ${MAX_BATCH} workouts at once`);
  const out = items.map((it, i) => {
    try { return makeAssignment(it, trainerId, now); }
    catch (e) { throw new AssignError(`${it && it.date ? it.date : 'workout ' + (i + 1)}: ${e.message}`); }
  });
  if (new Set(out.map(a => a.date)).size !== out.length) throw new AssignError('two workouts on the same day');
  return out;
}

/* ---------- the trainer's notes on a client: what the plan is built around ---------- */
// Keys only; the app owns the wording. Unknown keys are dropped, never stored.
export const GOALS = ['strength', 'muscle', 'fat_loss', 'endurance', 'health'];
export const LIMITS = ['knee', 'lower_back', 'shoulder', 'wrist', 'no_gym', 'beginner'];
export const FOCUS = ['full_body', 'upper_lower', 'push_pull_legs', 'glutes_legs', 'conditioning'];

const macroGoal = (m, lo, hi) => (Number.isInteger(+m) && +m >= lo && +m <= hi && m !== '' && m != null ? +m : null);
/** The trainer's daily target for the client: kcal and grams; null when not set. */
export function cleanMacros(m) {
  if (!m || typeof m !== 'object') return null;
  const out = { kcal: macroGoal(m.kcal, 500, 6000), protein: macroGoal(m.protein, 0, 400), carbs: macroGoal(m.carbs, 0, 900), fat: macroGoal(m.fat, 0, 300) };
  return Object.values(out).some(v => v != null) ? out : null;
}

export function cleanProfile({ goal, limits, focus, days, notes, macros }) {
  return {
    macros: cleanMacros(macros),
    goal: GOALS.includes(goal) ? goal : null,
    limits: Array.isArray(limits) ? [...new Set(limits.filter(l => LIMITS.includes(l)))] : [],
    focus: FOCUS.includes(focus) ? focus : null,
    days: Number.isInteger(+days) && +days >= 1 && +days <= 7 ? +days : null,
    notes: String(notes || '').trim().slice(0, 500)
  };
}
