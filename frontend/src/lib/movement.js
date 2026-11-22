// The movement check: seven whole-body patterns a trainer watches a client do, each marked as
// fine, limited or painful. It borrows its logic from the Selective Functional Movement
// Assessment (Cook and Kiesel): what hurts goes to a health professional and is not trained
// through, what is limited but painless is what mobility work is for. It is a screen, not a
// diagnosis, and it uses its own names and scoring, not the SFMA's.
//
// Pain on a pattern switches on the profile limitation it maps to, so the model ranking drops the
// models that load that area. The ids are shared with the server (api/trainer/assign.js).

export const PATTERNS = [
  { id: 'neck', name: 'Cuello', how: 'De pie: barbilla al pecho, mirar al techo y girar a cada lado.', ok: 'Toca el pecho con la barbilla, mira al techo y gira unos 80° a cada lado.', limit: null },
  { id: 'reach', name: 'Brazos arriba y atrás', how: 'Subir los dos brazos por encima de la cabeza; luego llevar una mano por detrás de la espalda hacia el omóplato contrario, con cada brazo.', ok: 'Brazos junto a las orejas sin arquear la espalda; la mano llega al omóplato.', limit: 'shoulder' },
  { id: 'bend', name: 'Flexión hacia adelante', how: 'Piernas rectas, bajar a tocar la punta de los pies.', ok: 'Toca los pies con la espalda curvada de forma pareja y la cadera hacia atrás.', limit: 'lower_back' },
  { id: 'extend', name: 'Extensión hacia atrás', how: 'Brazos arriba, llevar el tronco hacia atrás.', ok: 'Los brazos pasan por detrás de las orejas y la cadera se adelanta sin dolor.', limit: 'lower_back' },
  { id: 'rotate', name: 'Giro de tronco', how: 'Pies juntos y fijos, girar hombros y cadera a cada lado.', ok: 'Los hombros giran unos 90° a cada lado sin mover los pies.', limit: 'lower_back' },
  { id: 'single_leg', name: 'Apoyo en una pierna', how: 'Sostenerse sobre un pie, con la otra rodilla a la altura de la cadera, 10 segundos con cada pierna.', ok: '10 segundos estable con cada pierna, sin caer ni apoyar.', limit: 'knee' },
  { id: 'squat', name: 'Sentadilla profunda', how: 'Pies al ancho de los hombros y brazos arriba, bajar todo lo posible.', ok: 'Muslos por debajo de la horizontal, talones apoyados y brazos arriba.', limit: 'knee' }
]
export const patternById = Object.fromEntries(PATTERNS.map(p => [p.id, p]))
export const RESULTS = { ok: 'Bien', limited: 'Limitado', pain: 'Duele' }

/** The newest check on a profile, or null. */
export const latestCheck = profile => (profile?.screens || [])[0] || null

/** What a check says: the patterns that hurt, the ones that are limited, and the limitations
 *  the painful ones switch on. */
export function readCheck(check) {
  const r = check?.r || {}
  const pain = PATTERNS.filter(p => r[p.id] === 'pain')
  const limited = PATTERNS.filter(p => r[p.id] === 'limited')
  const limits = [...new Set(pain.map(p => p.limit).filter(Boolean))]
  return { pain, limited, limits, done: PATTERNS.filter(p => r[p.id]).length }
}

/** Days since the latest check, or null when there is none. */
export function checkAge(profile, today) {
  const c = latestCheck(profile)
  if (!c) return null
  return Math.round((new Date(today + 'T12:00:00') - new Date(c.d + 'T12:00:00')) / 86400000)
}

/** Patterns that got better (pain or limited → fine, pain → limited) since the check before. */
export function improved(profile) {
  const [now, before] = profile?.screens || []
  if (!now || !before) return []
  const rank = { ok: 0, limited: 1, pain: 2 }
  return PATTERNS.filter(p => before.r[p.id] && now.r[p.id] && rank[now.r[p.id]] < rank[before.r[p.id]])
}

// Repeat the check every four to eight weeks.
export const RECHECK_DAYS = 42
