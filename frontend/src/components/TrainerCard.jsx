import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { fmtDate } from '../lib/format.js'
import { useMyTrainer, useUnread } from '../lib/trainer.js'
import Icon from './Icon.jsx'

// On a client's Today: who their trainer is, unread messages, and the latest thing the trainer
// published. Renders nothing for someone without a trainer.
export default function TrainerCard({ nav }) {
  const trainer = useMyTrainer()
  const unread = useUnread(!!trainer)
  const [latest, setLatest] = useState(null)
  useEffect(() => { if (trainer) api('/api/content').then(d => setLatest(d.posts[0] || null)).catch(() => {}) }, [trainer?.id])
  if (!trainer) return null

  return <div className="card">
    <div className="row between" style={{ gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div className="lbl2">{t('Your trainer')}</div>
        <div style={{ fontWeight: 600, fontSize: 17 }} className="capitalize">{trainer.name}</div>
      </div>
      <button className="btn tinted" style={{ margin: 0, width: 'auto', flexShrink: 0 }} onClick={() => nav('/chat')}>
        <Icon name="chat" /> {unread ? t('{0} new', unread) : t('Message')}</button>
    </div>
    {latest && <button className="row between" onClick={() => nav('/content')}
      style={{ width: '100%', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--sep)', background: 'none', textAlign: 'left', color: 'inherit', gap: 10 }}>
      <span style={{ minWidth: 0 }}>
        <span className="dim" style={{ fontSize: '.72rem', display: 'block' }}>{t('Latest from your trainer')} · {fmtDate(latest.at.slice(0, 10))}</span>
        <span className="small" style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{latest.title}</span>
      </span>
      <Icon name="chevronRight" className="dim" />
    </button>}
  </div>
}
