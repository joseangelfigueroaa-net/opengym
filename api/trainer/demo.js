/* A demo client for a trainer (Trainnery): an account with two months of believable data —
 * weigh-ins, three workouts a week with progressing loads, a weekly plan, measurements, steps,
 * sleep and meals — so a trainer can see every screen of the client file filled in.
 *
 * The account has no passkey, so nobody can sign in as it; it exists only to be looked at, and
 * is flagged `demo` so it is easy to tell apart (and remove) later.
 */
import crypto from 'node:crypto';
import * as R from './records.js';

const DAY = 86400000;
const iso = t => new Date(t).toISOString().slice(0, 10);
// Monday of the week `now` falls in, at noon UTC, so weekdays line up whatever the time zone
const mondayOf = now => { const d = new Date(iso(now) + 'T12:00:00Z'); return d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY; };

// The two sessions it alternates, with starting load (kg), reps and the weekly increase
const SESSIONS = {
  A: { name: 'Cuerpo completo A', ex: [['1760', 12, 12, 2], ['0025', 30, 10, 2.5], ['0027', 30, 10, 2.5], ['0405', 8, 10, 1]] },
  B: { name: 'Cuerpo completo B', ex: [['0085', 35, 10, 2.5], ['0289', 12, 10, 1], ['0861', 25, 12, 2.5], ['1409', 30, 12, 5]] }
};

export function demoClient(name = 'Carla (demo)', now = Date.now()) {
  const id = 'demo-' + crypto.randomBytes(5).toString('hex');
  const user = { id, name, created: new Date(now - 60 * DAY).toISOString(), demo: true };
  const monday = mondayOf(now);

  // eight weeks of Monday / Wednesday / Friday, skipping a couple, loads rising week to week
  const workouts = [];
  for (let wk = 7; wk >= 0; wk--) {
    [0, 2, 4].forEach((dow, i) => {
      const t = monday - wk * 7 * DAY + dow * DAY + 18 * 3600000;
      if (t > now || (wk === 5 && i === 2) || (wk === 2 && i === 0)) return;
      const s = SESSIONS[(workouts.length % 2) ? 'B' : 'A'];
      const step = 7 - wk;
      workouts.push({
        id: 'w' + t.toString(36), d: iso(t), name: s.name, start: t, end: t + 52 * 60000,
        entries: s.ex.map(([exId, w0, reps, inc]) => {
          const w = w0 + Math.floor(step / 2) * inc;
          return { id: exId, sets: [0, 1, 2].map(k => ({ w, r: Math.max(6, reps - k), done: true })) };
        })
      });
    });
  }
  const bodyweight = [74.6, 74.1, 73.8, 73.2, 72.9, 72.5, 72.0, 71.8].map((w, i) => ({ d: iso(now - (56 - i * 8) * DAY), w }));
  const state = {
    lang: 'es', unit: 'kg', theme: 'dark', targetW: 68, _ts: now,
    bodyweight, workouts,
    routines: Object.entries(SESSIONS).map(([k, s]) => ({ id: 'demo' + k, name: s.name, ex: s.ex.map(([exId]) => ({ id: exId })) })),
    week: { 1: 'demoA', 3: 'demoB', 5: 'demoA' }
  };

  // records the client "logged": measurements, body fat, a week of steps and sleep, some meals
  const by = { id, role: 'client' };
  const rec = (kind, daysAgo, v) => R.makeEntry({ kind, d: iso(now - daysAgo * DAY), v }, by, now);
  const entries = [
    rec('measures', 56, { waist: 88, hip: 102, chest: 98, arm: 31, thigh: 58 }),
    rec('measures', 28, { waist: 86, hip: 101, chest: 98, arm: 31.5, thigh: 57.5 }),
    rec('measures', 2, { waist: 84.5, hip: 100, chest: 99, arm: 32, thigh: 57 }),
    rec('fat', 56, { pct: 27 }), rec('fat', 2, { pct: 25 }),
    ...[6, 5, 4, 3, 2, 1, 0].flatMap((n, i) => [
      rec('steps', n, { n: [7800, 9400, 6100, 11200, 8300, 10100, 5400][i] }),
      rec('sleep', n, { h: [7, 6.5, 7.5, 6, 7, 8, 7][i] })
    ]),
    rec('meal', 1, { meal: 'breakfast', text: 'Arepa con huevo revuelto y queso blanco, café con leche' }),
    rec('meal', 1, { meal: 'lunch', text: 'Pollo a la plancha, arroz, caraotas y ensalada' }),
    rec('meal', 1, { meal: 'snack', text: 'Yogur griego con cambur' }),
    rec('meal', 1, { meal: 'dinner', text: 'Pescado al horno con vegetales' }),
    rec('meal', 0, { meal: 'breakfast', text: 'Avena con fresas y un puñado de almendras' })
  ];
  return { user, state, entries };
}
