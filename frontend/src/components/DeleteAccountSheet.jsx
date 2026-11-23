import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { Button, TextField } from './ui.jsx'

// Deleting your own account (App Store 5.1.1(v), Google Play's account-deletion policy). It is
// for good, so the sheet says exactly what goes and asks for a typed word before the button
// works. A gym owner is told to close or hand over the gym first; the server refuses otherwise.
const WORD = 'BORRAR'

function DeleteAccountSheet({ onDeleted, close }) {
  const user = useStore(s => s.user)
  const deleteAccount = useStore(s => s.deleteAccount)
  const toast = useUI(s => s.toast)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const owner = user?.gym?.role === 'owner'
  const ready = typed.trim().toUpperCase() === WORD && !busy && !owner

  const go = async () => {
    setBusy(true)
    try { await deleteAccount(); close(); onDeleted && onDeleted() }
    catch (e) { setBusy(false); toast(e.status === 409 ? t('Close or hand over your gym before deleting your account.') : e.message) }
  }

  return <>
    <h3>{t('Delete your account?')}</h3>
    <p className="small" style={{ margin: '0 0 8px' }}>{t('Your account and everything in it are deleted for good, from every device:')}</p>
    <ul className="small" style={{ margin: '0 0 10px', paddingLeft: 18, display: 'grid', gap: 4 }}>
      <li>{t('your workouts, weigh-ins, measurements, meals and progress photos;')}</li>
      <li>{t('your messages, posts and comments;')}</li>
      <li>{t('your passkeys and the Google link;')}</li>
      <li>{t('your place at your gym and your link with your trainer.')}</li>
    </ul>
    {user?.trainer && <p className="small" style={{ margin: '0 0 10px' }}>{t('Your clients keep their accounts and their data, without a trainer.')}</p>}
    <p className="dim" style={{ fontSize: '.75rem', margin: '0 0 12px' }}>{t('It cannot be undone. Copies in our backups are erased within 3 months.')}</p>
    {owner
      ? <div className="card small" style={{ margin: '0 0 12px' }}>{t('You own a gym. Close it or hand it over to someone else first; then you can delete your account.')}</div>
      : <label className="small muted" style={{ display: 'grid', gap: 4, marginBottom: 12 }}>{t('Type {0} to confirm', WORD)}
        <TextField value={typed} onChange={e => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-label={t('Type {0} to confirm', WORD)} /></label>}
    <Button variant="danger" onClick={go} disabled={!ready}>{busy ? t('Deleting…') : t('Delete my account')}</Button>
    <div style={{ height: 8 }} />
    <Button onClick={close} disabled={busy}>{t('Cancel')}</Button>
  </>
}

export function deleteAccountSheet(opts = {}) {
  return useUI.getState().openSheet(close => <DeleteAccountSheet {...opts} close={close} />)
}
