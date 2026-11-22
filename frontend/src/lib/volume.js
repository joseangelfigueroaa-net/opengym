// Weekly sets per muscle group: the dose that best predicts muscle growth.
//
// Schoenfeld, Ogborn and Krieger (2017) found a graded dose-response between weekly sets and
// hypertrophy, with 10 or more sets per muscle a week doing best; the ACSM position stand (2026)
// lands on about 10. A set counts in full for the exercise's main target and as half a set for
// its second muscle (a squat is a set for the glutes and half a set for the quads), the
// fractional count recent dose-response work uses. Cardio blocks are not sets.

import { exOr } from './exercises.js'

// Target muscles in the library, gathered into the groups a trainer plans by.
const GROUP = {
  pectorals: 'Pecho', lats: 'Espalda', 'upper back': 'Espalda', traps: 'Espalda',
  delts: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebrazos',
  quads: 'Cuádriceps', hamstrings: 'Isquiotibiales', glutes: 'Glúteos', abductors: 'Glúteos', adductors: 'Aductores',
  calves: 'Pantorrillas', abs: 'Abdomen', spine: 'Zona lumbar'
}
// The library's second-muscle names.
const SECOND = {
  chest: 'Pecho', 'latissimus dorsi': 'Espalda', lats: 'Espalda', 'upper back': 'Espalda', rhomboids: 'Espalda', trapezius: 'Espalda', traps: 'Espalda',
  shoulders: 'Hombros', deltoids: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebrazos',
  quadriceps: 'Cuádriceps', hamstrings: 'Isquiotibiales', glutes: 'Glúteos', calves: 'Pantorrillas', soleus: 'Pantorrillas',
  obliques: 'Abdomen', abdominals: 'Abdomen', core: 'Abdomen', 'lower back': 'Zona lumbar'
}
const ORDER = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Antebrazos', 'Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Aductores', 'Pantorrillas', 'Abdomen', 'Zona lumbar']

/** Sets a week per muscle group when `sessions` rotate over `daysPerWeek` training days.
 *  Returns [[group, sets]] in a fixed head-to-toe order, groups with no sets left out. */
export function weeklySets(sessions, daysPerWeek, lookup = exOr) {
  if (!sessions?.length || !daysPerWeek) return []
  const perSession = daysPerWeek / sessions.length   // how often each session comes round in a week
  const out = {}
  for (const s of sessions) for (const x of s.ex) {
    if ((x.mode || 'reps') === 'cardio') continue
    const ex = lookup(x.id) || {}
    const g = GROUP[ex.tg], g2 = SECOND[ex.mg]
    if (g) out[g] = (out[g] || 0) + (x.sets || 0) * perSession
    if (g2 && g2 !== g) out[g2] = (out[g2] || 0) + (x.sets || 0) * perSession / 2
  }
  return ORDER.filter(g => out[g]).map(g => [g, Math.round(out[g] * 10) / 10])
}

/** Where a weekly set count sits for growth: below 5 is maintenance, 5–9 grows, 10–20 is the
 *  range with the best returns, past 20 returns shrink and recovery gets harder. */
export function volumeBand(sets) {
  if (sets < 5) return { key: 'low', label: 'Mantenimiento', cls: '' }
  if (sets < 10) return { key: 'mid', label: 'Moderado', cls: 'warn' }
  if (sets <= 20) return { key: 'good', label: 'Óptimo para hipertrofia', cls: 'ok' }
  return { key: 'high', label: 'Alto', cls: 'acc' }
}
