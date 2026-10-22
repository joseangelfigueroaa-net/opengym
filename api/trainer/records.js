/* Client records that both the client and their trainer write (Trainnery).
 *
 * Kept apart from the client's state file on purpose: the app uploads that file whole on every
 * save (PUT /api/data), so anything a trainer wrote into it would be overwritten by the next
 * sync. Here each entry is its own row, written by whoever logged it:
 *
 *   records-<clientId>.json   { entries: [{ id, kind, d, v, by, role, at }] }
 *
 * Body weight also lives in the client's own state (S.bodyweight, which workouts and Stats
 * already read); weightSeries() merges the two so every screen shows one curve.
 */
import crypto from 'node:crypto';

// Allowed fields per kind and their bounds. Anything else in `v` is dropped, never stored.
export const KINDS = {
  weight: { kg: [20, 400] },
  fat: { pct: [2, 75] },
  measures: { waist: [20, 250], hip: [20, 250], chest: [20, 250], arm: [10, 100], thigh: [10, 150] },
  steps: { n: [0, 150000] },
  sleep: { h: [0, 24] },
  meal: null   // free text, validated below
};
export const MEALS = ['breakfast', 'lunch', 'snack', 'dinner'];
// Optional on a meal: energy (kcal) and grams of each macronutrient
export const MACROS = { kcal: [0, 5000], protein: [0, 500], carbs: [0, 1000], fat: [0, 500] };
export const MAX_ENTRIES = 5000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export class RecordError extends Error {}

/** Returns a clean entry ready to store, or throws RecordError with a user-facing reason. */
export function makeEntry({ kind, d, v }, author, now = Date.now()) {
  if (!Object.hasOwn(KINDS, kind)) throw new RecordError('unknown record type');
  if (!ISO_DAY.test(String(d || '')) || isNaN(Date.parse(d))) throw new RecordError('a valid date is required');
  if (Date.parse(d) > now + 86400000) throw new RecordError('the date cannot be in the future');
  v = v && typeof v === 'object' ? v : {};
  let clean = {};
  if (kind === 'meal') {
    const meal = MEALS.includes(v.meal) ? v.meal : null;
    const text = String(v.text || '').trim().slice(0, 300);
    if (!meal) throw new RecordError('choose which meal it was');
    if (!text) throw new RecordError('describe what was eaten');
    clean = { meal, text };
    for (const [k, [lo, hi]] of Object.entries(MACROS)) {
      if (v[k] === undefined || v[k] === null || v[k] === '') continue;
      const n = Number(v[k]);
      if (!Number.isFinite(n) || n < lo || n > hi) throw new RecordError(`${k} must be between ${lo} and ${hi}`);
      clean[k] = Math.round(n);
    }
  } else {
    for (const [k, [lo, hi]] of Object.entries(KINDS[kind])) {
      if (v[k] === undefined || v[k] === null || v[k] === '') continue;
      const n = Number(v[k]);
      if (!Number.isFinite(n) || n < lo || n > hi) throw new RecordError(`${k} must be between ${lo} and ${hi}`);
      clean[k] = Math.round(n * 10) / 10;
    }
    if (!Object.keys(clean).length) throw new RecordError('enter at least one value');
  }
  return {
    id: crypto.randomBytes(8).toString('hex'), kind, d, v: clean,
    by: author.id, role: author.role, at: new Date(now).toISOString()
  };
}

export function addEntry(file, entry) {
  file.entries = file.entries || [];
  if (file.entries.length >= MAX_ENTRIES) throw new RecordError('record limit reached for this client');
  file.entries.push(entry);
  return entry;
}

/** Only the person who logged an entry can delete it — a client cannot erase the trainer's
 *  weigh-in, nor the trainer the client's own note. */
export function removeEntry(file, id, authorId) {
  const e = (file.entries || []).find(x => x.id === id);
  if (!e) throw new RecordError('no such record');
  if (e.by !== authorId) throw new RecordError('only whoever logged a record can delete it');
  file.entries = file.entries.filter(x => x.id !== id);
}

const byDay = (a, b) => a.d.localeCompare(b.d) || String(a.at || '').localeCompare(String(b.at || ''));

/** The newest `n` records by the day they describe (not when they were typed in), newest first. */
export const latest = (entries, n) => [...(entries || [])].sort(byDay).slice(-n).reverse();

/** One weight curve from the client's own log and the records; on the same day the record
 *  (a deliberate weigh-in) wins over the app's log. */
export function weightSeries(stateBodyweight, entries) {
  const m = new Map();
  for (const b of stateBodyweight || []) if (b && b.d && Number(b.w) > 0) m.set(b.d, { d: b.d, w: Number(b.w), src: 'app' });
  for (const e of (entries || []).filter(x => x.kind === 'weight').sort(byDay)) m.set(e.d, { d: e.d, w: e.v.kg, src: e.role });
  return [...m.values()].sort((a, b) => a.d.localeCompare(b.d));
}

/** Values of one kind over time, oldest first: [{ d, ...v }]. Measures carry forward, so a
 *  partial entry (waist only) still has the other zones from the last time they were taken. */
export function series(entries, kind) {
  const list = (entries || []).filter(e => e.kind === kind).sort(byDay);
  if (kind !== 'measures') return list.map(e => ({ d: e.d, ...e.v }));
  let last = {};
  return list.map(e => (last = { ...last, ...e.v, d: e.d }));
}

/** First and latest value per measure zone, for the "initial / current / change" table. */
export function measureTable(entries) {
  const out = {};
  for (const zone of Object.keys(KINDS.measures)) {
    const vals = (entries || []).filter(e => e.kind === 'measures' && e.v[zone] != null).sort(byDay);
    if (vals.length) out[zone] = { first: vals[0].v[zone], last: vals[vals.length - 1].v[zone], d: vals[vals.length - 1].d };
  }
  return out;
}

/** Averages over the last `days` days of steps and sleep, and how many meals were logged. */
export function weekSummary(entries, today, days = 7) {
  const since = new Date(Date.parse(today) - (days - 1) * 86400000).toISOString().slice(0, 10);
  const recent = (entries || []).filter(e => e.d >= since && e.d <= today);
  const avg = (kind, k) => {
    const v = recent.filter(e => e.kind === kind && e.v[k] != null).map(e => e.v[k]);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null;
  };
  // macros: totals per day, averaged over the days that have any (a day with no macros logged
  // says nothing about what was eaten)
  const perDay = {};
  for (const e of recent) if (e.kind === 'meal') for (const k of Object.keys(MACROS)) if (e.v[k] != null) {
    const day = perDay[e.d] || (perDay[e.d] = {});
    day[k] = (day[k] || 0) + e.v[k];
  }
  const totals = Object.values(perDay);
  const macros = totals.length ? Object.fromEntries(Object.keys(MACROS).map(k => {
    const v = totals.filter(d => d[k] != null).map(d => d[k]);
    return [k, v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null];
  })) : null;
  return { steps: avg('steps', 'n'), sleep: avg('sleep', 'h'), meals: recent.filter(e => e.kind === 'meal').length, macros, macroDays: totals.length };
}
