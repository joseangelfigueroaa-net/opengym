import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { SHIFTS } from '../lib/gym.js'
import Icon from '../components/Icon.jsx'
import { Button, Segmented } from '../components/ui.jsx'

// Where a gym's link lands once the person is signed in: the member code from the front desk, or
// a trainer's staff link. Says plainly what the gym will see before anything is shared.

export default function GymJoin() {
  const nav = useNavigate()
  const { token } = useParams()
  const toast = useUI(s => s.toast)
  const setUser = useStore(s => s.setUser)
  const [inv, setInv] = useState(null)      // { gym: { name }, kind } | { error }
  const [shift, setShift] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api('/api/gym/join?token=' + encodeURIComponent(token)).then(setInv).catch(e => setInv({ error: e.message }))
  }, [token])

  const accept = () => {
    setBusy(true)
    api('/api/gym/join', { method: 'POST', body: JSON.stringify({ token, shift }) })
      .then(async r => {
        // a staff link can make this account a trainer: the app needs the new role to route
        const me = await api('/api/me').catch(() => null)
        if (me?.user) setUser(me.user)
        toast(t('Welcome to {0}', r.gym.name))
        nav(r.kind === 'trainer' ? '/trainer' : '/home', { replace: true })
      })
      .catch(e => { setBusy(false); toast(e.message) })
  }

  const wrap = { display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }
  const staff = inv?.kind === 'trainer'
  return <div className="narrow" style={wrap}>
    <div style={{ fontSize: 48, display: 'flex', justifyContent: 'center', color: 'var(--acc)' }}><Icon name="dumbbell" /></div>
    {!inv ? <div className="muted" style={{ marginTop: 16 }}>{t('Loading…')}</div>
      : inv.error ? <>
        <h1 style={{ margin: '12px 0 6px' }}>{t('This link doesn’t work')}</h1>
        <div className="muted" style={{ marginBottom: 24 }}>{inv.error}</div>
        <Button onClick={() => nav('/home', { replace: true })}>{t('Go to the app')}</Button>
      </> : <>
        <h1 style={{ margin: '12px 0 6px' }}>{staff ? t('Join {0} as a trainer', inv.gym.name) : t('Join {0}', inv.gym.name)}</h1>
        <div className="muted" style={{ marginBottom: 20 }}>
          {staff ? t('The gym will assign you members and see how many clients you carry. Your clients’ data stays between you and them.')
            : t('The gym will see your name, your shift, your trainer, when you last trained and, in words, whether you are moving toward your goal and keeping to your plan. It does not see your weights, meals, photos or messages. You can leave anytime in Settings.')}
        </div>
        <div className="small muted" style={{ marginBottom: 8, textAlign: 'left' }}>{staff ? t('When do you work?') : t('When do you usually train?')}</div>
        <Segmented options={SHIFTS.map(([value, label]) => ({ value, label: t(label) }))} value={shift} onChange={setShift} />
        <div style={{ height: 20 }} />
        <Button variant="primary" onClick={accept} disabled={busy}>{busy ? t('Joining…') : t('Join the gym')}</Button>
        <div style={{ height: 10 }} />
        <Button variant="ghost" className="dim" onClick={() => nav('/home', { replace: true })}>{t('Not now')}</Button>
      </>}
  </div>
}
