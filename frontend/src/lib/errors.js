import { t } from './i18n.js'

// The API answers in short English phrases ({ error: 'no such client' }). They reach people as
// toasts and inline errors, so they go through the same string packs as the rest of the UI.
// Fixed phrases are plain keys; the few built from numbers or field names are matched here.
const FIELDS = { sets: 'sets', reps: 'reps', 'minimum reps': 'minimum reps', seconds: 'seconds', rounds: 'rounds', minutes: 'minutes',
  speed: 'speed', weight: 'weight', rest: 'rest', kg: 'weight', pct: 'body fat', n: 'steps', h: 'hours slept',
  waist: 'waist', hip: 'hips', chest: 'chest', arm: 'arm', thigh: 'thigh',
  name: 'name', age: 'age', story: 'story', description: 'description', certifications: 'certifications', methods: 'methods' }
const field = f => t(FIELDS[f] || f)

const PATTERNS = [
  [/^exercise (\d+): (.+)$/, (m, n, rest) => t('exercise {0}: {1}', n, translateError(rest))],
  [/^workout (\d+): (.+)$/, (m, n, rest) => t('workout {0}: {1}', n, translateError(rest))],
  [/^(\d{4}-\d\d-\d\d): (.+)$/, (m, d, rest) => d + ': ' + translateError(rest)],
  [/^verification failed: ?(.*)$/, (m, rest) => t('verification failed') + (rest ? ': ' + rest : '')],
  [/^(.+) must be a whole number from (\S+) to (\S+)$/, (m, f, lo, hi) => t('{0} must be a whole number from {1} to {2}', field(f), lo, hi)],
  [/^(.+) must be from (\S+) to (\S+)$/, (m, f, lo, hi) => t('{0} must be from {1} to {2}', field(f), lo, hi)],
  [/^(.+) must be between (\S+) and (\S+)$/, (m, f, lo, hi) => t('{0} must be from {1} to {2}', field(f), lo, hi)],
  [/^workouts can be assigned up to (\d+) days ahead$/, (m, n) => t('workouts can be assigned up to {0} days ahead', n)],
  [/^up to (\d+) exercises per workout$/, (m, n) => t('up to {0} exercises per workout', n)],
  [/^up to (\d+) workouts at once$/, (m, n) => t('up to {0} workouts at once', n)],
  [/^messages are limited to (\d+) characters$/, (m, n) => t('messages are limited to {0} characters', n)],
  [/^(.+) is limited to (\d+) characters$/, (m, f, n) => t('{0} is limited to {1} characters', field(f), n)],
  [/^up to (\d+) (certifications|methods)$/, (m, n, f) => t('up to {0} {1}', n, field(f))],
]

export function translateError(msg) {
  if (!msg) return msg
  for (const [re, fn] of PATTERNS) { const m = msg.match(re); if (m) return fn(...m) }
  return t(msg)
}
