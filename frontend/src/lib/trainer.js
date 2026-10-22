// Trainer ↔ client links (Trainnery). The rules live server-side in api/trainer/; this is the
// link format, the record vocabulary the screens share, and two small polling hooks.
import { useEffect, useState } from 'react'
import { t, dateLocale } from './i18n.js'
import { api } from './api.js'
import { fmtNum } from './format.js'

const JOIN = /^#\/join\/([0-9a-f]{32})$/i

// The invite token in the address bar, if someone opened a trainer's link. Read from the hash
// directly so the signup sheet can use it before the router has rendered anything.
export const pendingInviteToken = () => (location.hash.match(JOIN) || [])[1] || null

export const inviteUrl = token => location.origin + location.pathname + '#/join/' + token

// Share sheet where the device has one (that's how a trainer sends it on WhatsApp); else the
// clipboard. Resolves to a short message for a toast, or null when the person cancelled.
export async function shareInvite(token) {
  const url = inviteUrl(token)
  if (navigator.share) {
    try { await navigator.share({ title: t('Your trainer invite'), text: t('Join me as my client:'), url }); return t('Invite link shared') }
    catch (e) { if (e.name === 'AbortError') return null }
  }
  try { await navigator.clipboard.writeText(url); return t('Invite link copied') }
  catch { return url }
}

/* ---------- records: what each kind holds and how it reads ---------- */
// Field order is the order the form shows them; units are display only (the server stores
// plain numbers). Bounds mirror api/trainer/records.js.
export const RECORD_KINDS = {
  weight: { label: 'Body weight', icon: 'scale', fields: [['kg', 'Weight', 'kg']] },
  fat: { label: 'Body fat', icon: 'flame', fields: [['pct', 'Body fat', '%']] },
  measures: {
    label: 'Measurements', icon: 'target', fields: [
      ['waist', 'Waist', 'cm'], ['hip', 'Hips', 'cm'], ['chest', 'Chest', 'cm'], ['arm', 'Arm', 'cm'], ['thigh', 'Thigh', 'cm']]
  },
  steps: { label: 'Steps', icon: 'figureRun', fields: [['n', 'Steps', '']] },
  sleep: { label: 'Sleep', icon: 'moon', fields: [['h', 'Hours slept', 'h']] },
  meal: { label: 'Meal', icon: 'clipboard', fields: [] }
}
export const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['snack', 'Snack'], ['dinner', 'Dinner']]
export const MEASURE_ZONES = RECORD_KINDS.measures.fields

/** One line saying what a record holds: "72,4 kg", "Waist 88 cm · Arm 35 cm", "Lunch: rice…". */
export function recordText(kind, v) {
  if (kind === 'meal') return t(MEALS.find(m => m[0] === v.meal)?.[1] || 'Meal') + ': ' + v.text
  if (kind === 'steps') return Math.round(v.n).toLocaleString(dateLocale()) + ' ' + t('steps')
  return RECORD_KINDS[kind].fields.filter(([k]) => v[k] != null)
    .map(([k, label, unit]) => (kind === 'measures' ? t(label) + ' ' : '') + fmtNum(v[k]) + (unit ? ' ' + unit : '')).join(' · ')
}

export const saveRecord = (rec, clientId) => clientId
  ? api('/api/trainer/client/records', { method: 'POST', body: JSON.stringify({ id: clientId, ...rec }) })
  : api('/api/records', { method: 'POST', body: JSON.stringify(rec) })

export const deleteRecord = (id, clientId) => clientId
  ? api('/api/trainer/client/records/delete', { method: 'POST', body: JSON.stringify({ id: clientId, record: id }) })
  : api('/api/records/delete', { method: 'POST', body: JSON.stringify({ id }) })

/** "4 × 6–8 · 60 kg · 90 s rest", "3 × 45 s", "6 × 2 min · 12 km/h": one prescribed exercise. */
export function prescription(x, unit = 'kg') {
  const mode = x.mode || 'reps'
  const main = mode === 'time' ? `${x.sets} × ${x.sec} s` : mode === 'cardio' ? `${x.sets} × ${fmtNum(x.min)} min` : `${x.sets} × ${x.repsMin}–${x.reps}`
  const w = x.weight ? ` · ${fmtNum(x.weight)} ${unit}` : ''
  const sp = x.speed ? ` · ${fmtNum(x.speed)} km/h` : ''
  const rest = x.rest ? ` · ${t('{0} s rest', x.rest)}` : ''
  return main + w + sp + rest
}

/* ---------- client status, as the server computes it ---------- */
export function statusTag(status) {
  if (!status || status.code === 'new') return { cls: '', text: t('No activity yet') }
  if (status.code === 'inactive') return { cls: 'bad', text: t('{0} days without logging', status.days) }
  if (status.code === 'stalled') return { cls: 'warn', text: t('Weight stalled') }
  return { cls: 'ok', text: t('On track') }
}

/* ---------- hooks ---------- */
// The signed-in client's trainer ({ id, name, since } or null), shared across screens so the
// tab bar and Today don't each ask. `undefined` while the first answer is on its way.
let trainerCache, trainerAsk
export function useMyTrainer(enabled = true) {
  const [tr, setTr] = useState(trainerCache)
  useEffect(() => {
    if (!enabled) return
    if (!trainerAsk) trainerAsk = api('/api/me/trainer').then(r => (trainerCache = r.trainer)).catch(() => (trainerCache = null))
    trainerAsk.then(v => setTr(v))
  }, [enabled])
  return enabled ? tr : null
}
export const forgetMyTrainer = () => { trainerCache = undefined; trainerAsk = null }

// Unread chat messages for the badge, re-checked every 30 s while the app is open and visible.
export function useUnread(enabled) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let live = true
    const ask = () => { if (!document.hidden) api('/api/chat/unread').then(r => live && setN(r.count)).catch(() => {}) }
    ask()
    const iv = setInterval(ask, 30000)
    window.addEventListener('focus', ask)
    window.addEventListener('trainnery:read', ask)
    return () => { live = false; clearInterval(iv); window.removeEventListener('focus', ask); window.removeEventListener('trainnery:read', ask) }
  }, [enabled])
  return n
}

/* ---------- workouts the trainer assigned ---------- */
// Each assignment becomes an ordinary routine (id tr-<assignment id>) pinned to its day through
// dayPlan, so Today, the Start button, the guided workout and progression all treat it like
// any other session. Double progression over the trainer's rep range is what the app applies
// when the client starts. Routines for assignments the trainer withdrew (or replaced) go away;
// past ones are kept two weeks so a just-finished session still reads right in History.
export const ASSIGNED = 'tr-'

/** One assigned exercise as a routine entry. Reps progress with double progression over the
 *  trainer's range (the weight, if given, is where a first session starts); timed holds add
 *  time; cardio stays as prescribed. `rest` overrides the client's rest timer for it. */
export function toConfig(x) {
  const mode = x.mode || 'reps'
  const rest = x.rest > 0 ? { rest: x.rest } : {}
  if (mode === 'time') return { id: x.id, sets: x.sets, sec: x.sec, weight: x.weight || 0, mode, prog: 'time', ...rest }
  if (mode === 'cardio') return { id: x.id, sets: x.sets || 1, min: x.min, speed: x.speed || 8, mode, prog: 'off', ...rest }
  return { id: x.id, sets: x.sets, reps: x.reps, repsMin: x.repsMin, weight: x.weight || 0, mode: 'reps', prog: 'double', ...rest }
}
export function applyAssignments(S, assignments, today) {
  const keepFrom = new Date(Date.parse(today) - 14 * 86400000).toISOString().slice(0, 10)
  const live = new Set(assignments.map(a => ASSIGNED + a.id))
  const from = new Date(Date.parse(today) - 86400000).toISOString().slice(0, 10)
  // drop: withdrawn ones still ahead (the server serves yesterday on) and stale ones
  const gone = S.routines.filter(r => r.id.startsWith(ASSIGNED) && r.assigned &&
    ((r.assigned.date >= from && !live.has(r.id)) || r.assigned.date < keepFrom)).map(r => r.id)
  S.routines = S.routines.filter(r => !gone.includes(r.id))
  for (const [d, rid] of Object.entries(S.dayPlan)) if (gone.includes(rid)) delete S.dayPlan[d]
  for (const a of assignments) {
    const id = ASSIGNED + a.id
    const routine = {
      id, name: a.name, emoji: '💪', prog: 'double',
      assigned: { date: a.date, note: a.note || '', sentAt: a.sentAt },
      ex: a.ex.map(toConfig)
    }
    const i = S.routines.findIndex(r => r.id === id)
    if (i >= 0) S.routines[i] = { ...S.routines[i], ...routine }; else S.routines.push(routine)
    S.dayPlan[a.date] = id
  }
}
