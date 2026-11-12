import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import Icon from './Icon.jsx'

// A gym member says "I'm here" once a day. The gym counts it as attendance, so someone who comes
// in without logging anything in the app is not taken for someone who stopped coming.
export default function GymCheckIn() {
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const [v, setV] = useState(null)
  const [busy, setBusy] = useState(false)
  const member = user?.gym?.role === 'member'
  useEffect(() => {
    if (!member) return
    api('/api/me/gym/visit?d=' + todayISO()).then(setV).catch(() => {})
  }, [member])
  if (!member || !v?.member) return null

  const checkIn = () => {
    setBusy(true)
    api('/api/gym/checkin', { method: 'POST', body: JSON.stringify({ d: todayISO() }) })
      .then(r => { setV({ ...v, inToday: true, visits30: v.visits30 + (r.already ? 0 : 1) }); toast(t('Check-in recorded at {0}', r.gym.name)) })
      .catch(e => toast(e.message))
      .finally(() => setBusy(false))
  }

  return <div className="card row between" style={{ gap: 12 }}>
    <div style={{ minWidth: 0 }}>
      <div className="small muted">{v.gym.name}</div>
      <div style={{ fontWeight: 600 }}>{v.inToday ? t('You checked in today') : t('At the gym?')}</div>
      <div className="dim" style={{ fontSize: '.75rem' }}>{v.visits30 === 1 ? t('1 visit in the last 30 days') : t('{0} visits in the last 30 days', v.visits30)}</div>
    </div>
    {v.inToday
      ? <span className="tag ok nocap" style={{ flexShrink: 0 }}><Icon name="checkCircle" /> {t('Checked in')}</span>
      : <button className="btn primary" style={{ width: 'auto', flexShrink: 0, padding: '0 16px' }} disabled={busy} onClick={checkIn}><Icon name="check" /> {t("I'm here")}</button>}
  </div>
}
