import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { fmtDate, todayISO } from '../lib/format.js'
import { exOr } from '../lib/exercises.js'
import { useMyTrainer, useUnread, prescription } from '../lib/trainer.js'
import { startFlow } from '../sheets.jsx'
import Icon from './Icon.jsx'

// On a client's Today: who their trainer is, the workout they assigned for today (with their
// note and the rep range for each exercise), unread messages, and the latest thing the trainer
// published. Renders nothing for someone without a trainer.
export default function TrainerCard({ nav }) {
  const trainer = useMyTrainer()
  const unread = useUnread(!!trainer)
  const S = useStore(s => s.S)
  const [latest, setLatest] = useState(null)
  useEffect(() => { if (trainer) api('/api/content').then(d => setLatest(d.posts[0] || null)).catch(() => {}) }, [trainer?.id])
  if (!trainer) return null

  const today = todayISO()
  const assigned = S.routines.find(r => r.assigned && r.assigned.date === today && S.dayPlan[today] === r.id)
  const doneToday = S.workouts.some(w => w.d === today)
  const next = !assigned && S.routines.filter(r => r.assigned && r.assigned.date > today).sort((a, b) => a.assigned.date.localeCompare(b.assigned.date))[0]

  return <div className="card">
    <div className="row between" style={{ gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div className="lbl2">{t('Your trainer')}</div>
        <div style={{ fontWeight: 600, fontSize: 17 }} className="capitalize">{trainer.name}</div>
      </div>
      <button className="btn tinted" style={{ margin: 0, width: 'auto', flexShrink: 0 }} onClick={() => nav('/chat')}>
        <Icon name="chat" /> {unread ? t('{0} new', unread) : t('Message')}</button>
    </div>

    {assigned && <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--sep)' }}>
      <div className="lbl2">{t('Assigned for today')}</div>
      <div style={{ fontWeight: 600, fontSize: 17 }}>{assigned.name}</div>
      {assigned.assigned.note && <div className="small" style={{ marginTop: 6, padding: '8px 10px', borderRadius: 10, background: 'var(--acc-soft)', whiteSpace: 'pre-wrap' }}>
        <b>{t('Note from your trainer')}:</b> {assigned.assigned.note}</div>}
      <div style={{ marginTop: 6 }}>
        {assigned.ex.map((x, i) => <div key={i} className="row between small" style={{ padding: '6px 0', borderTop: i ? '1px solid var(--sep)' : 'none', gap: 8 }}>
          <span className="capitalize" style={{ minWidth: 0 }}>{exOr(x.id).n}</span>
          <span className="muted" style={{ flexShrink: 0, textAlign: 'right' }}>{prescription(x, S.unit)}</span>
        </div>)}
      </div>
      {doneToday ? <div className="tag ok nocap" style={{ marginTop: 8 }}>{t('Done — your trainer can see it')}</div>
        : !S.active && <button className="btn primary" style={{ marginTop: 10 }} onClick={() => startFlow(assigned.id)}><Icon name="play" /> {t('Start workout')}</button>}
    </div>}
    {next && <div className="dim small" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--sep)' }}>
      {t('Next assigned: {0} · {1}', next.name, fmtDate(next.assigned.date, true))}</div>}

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
