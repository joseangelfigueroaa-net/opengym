// Gyms (Trainnery). The rules live server-side in api/trainer/gym.js; this is the link format,
// the shift vocabulary and the share helper the gym screens use.
import { t } from './i18n.js'

export const gymJoinUrl = token => location.origin + location.pathname + '#/gym/join/' + token

export const SHIFTS = [['', 'Any time'], ['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening']]
export const shiftLabel = s => t((SHIFTS.find(x => x[0] === (s || '')) || SHIFTS[0])[1])
export const GYM_PLAN = { basic: 'Basic', pro: 'Pro', chain: 'Chain' }

// Share sheet where the device has one (WhatsApp from a phone), else the clipboard. Resolves to a
// short message for a toast, or null when the person cancelled.
export async function shareGymLink(token, kind, gymName) {
  const url = gymJoinUrl(token)
  const text = kind === 'trainer' ? t('Join {0} as a trainer:', gymName) : t('Join {0} on Trainnery:', gymName)
  if (navigator.share) {
    try { await navigator.share({ title: gymName, text, url }); return t('Link shared') }
    catch (e) { if (e.name === 'AbortError') return null }
  }
  try { await navigator.clipboard.writeText(url); return t('Link copied') }
  catch { return url }
}
