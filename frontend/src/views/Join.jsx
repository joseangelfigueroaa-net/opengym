import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

// Where a trainer's invite link lands once the person is signed in (signed out, the login screen
// shows first and keeps this address). Nothing is shared until they press Accept.

export default function Join() {
  const nav = useNavigate()
  const { token } = useParams()
  const toast = useUI(s => s.toast)
  const [inv, setInv] = useState(null)      // { trainer: { name } } | { error }
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api('/api/invite?token=' + encodeURIComponent(token)).then(setInv).catch(e => setInv({ error: e.message }))
  }, [token])

  const accept = () => {
    setBusy(true)
    api('/api/invite/accept', { method: 'POST', body: JSON.stringify({ token }) })
      .then(r => { toast(t('{0} is now your trainer', r.trainer.name)); nav('/home', { replace: true }) })
      .catch(e => { setBusy(false); toast(e.message) })
  }

  const wrap = { display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }
  return <div className="narrow" style={wrap}>
    <div style={{ fontSize: 48, display: 'flex', justifyContent: 'center', color: 'var(--acc)' }}><Icon name="personCircle" /></div>
    {!inv ? <div className="muted" style={{ marginTop: 16 }}>{t('Loading…')}</div>
      : inv.error ? <>
        <h1 style={{ margin: '12px 0 6px' }}>{t('This link doesn’t work')}</h1>
        <div className="muted" style={{ marginBottom: 24 }}>{inv.error}</div>
        <Button onClick={() => nav('/home', { replace: true })}>{t('Go to the app')}</Button>
      </> : <>
        <h1 style={{ margin: '12px 0 6px' }}>{t('{0} invited you', inv.trainer.name)}</h1>
        <div className="muted" style={{ marginBottom: 24 }}>{t('As their client, they will see your workouts, body weight and plan. They cannot change anything, and you can leave anytime in Settings.')}</div>
        <Button variant="primary" onClick={accept} disabled={busy}>{t('Accept invite')}</Button>
        <div style={{ height: 10 }} />
        <Button variant="ghost" className="dim" onClick={() => nav('/home', { replace: true })}>{t('Not now')}</Button>
      </>}
  </div>
}
