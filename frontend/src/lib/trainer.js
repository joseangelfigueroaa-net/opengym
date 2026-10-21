// Trainer ↔ client links (Trainnery). The rules live server-side in api/trainer/logic.js; this
// is only the link format and how it is handed on.
import { t } from './i18n.js'

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
