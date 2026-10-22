import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from './Icon.jsx'

// Asks first, because signing out also clears this device (after a final sync).
export function askSignOut(signOut, nav) {
  confirmSheet({
    title: t('Sign out?'), message: t('Your data is synced to your profile first, then cleared from this device.'),
    confirmText: t('Sign out'), danger: true, onConfirm: () => { signOut(); nav('/home') }
  })
}

// Header button on the main screens (Trainnery), so signing out is not buried in Settings.
// Renders nothing for a guest, who has no session to end.
export default function SignOutButton() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const signOut = useStore(s => s.signOut)
  if (!user) return null
  return <button className="iconbtn" onClick={() => askSignOut(signOut, nav)} aria-label={t('Sign out')} title={t('Sign out')}>
    <Icon name="signOut" /></button>
}
