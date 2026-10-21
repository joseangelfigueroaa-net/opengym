import { useEffect, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { todayISO, fmtDate } from '../lib/format.js'
import { GOALS, LIMITS, FOCUS } from '../lib/programs.js'
import { confirmSheet } from '../sheets.jsx'
import { assignSheet } from './AssignSheet.jsx'
import { profileSheet } from './ProfileSheet.jsx'
import Icon from './Icon.jsx'

// The client file's training plan: what it is built around (profile), what is assigned from
// last week to two months ahead (and whether each past day got done), and the two ways to add
// to it — one day by hand, or a training model laid over the month.
export default function TrainerPlanCard({ client, nav }) {
  const toast = useUI(s => s.toast)
  const [d, setD] = useState(null)
  const load = () => api('/api/trainer/client/assignments?id=' + encodeURIComponent(client.id)).then(setD).catch(e => toast(e.message))
  useEffect(() => { load() }, [client.id])

  const today = todayISO()
  const done = new Set(client.history.map(w => w.d))
  const list = d ? [...d.assignments].sort((a, b) => a.date.localeCompare(b.date)).filter(a => a.date >= new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)) : []
  const ahead = list.filter(a => a.date >= today)
  const lastDay = ahead.length ? ahead[ahead.length - 1].date : null
  const p = d?.profile
  const del = a => confirmSheet({
    title: t('Remove this workout?'), message: a.name + ' · ' + fmtDate(a.date, true),
    confirmText: t('Remove'), danger: true,
    onConfirm: () => api('/api/trainer/client/assign/delete', { method: 'POST', body: JSON.stringify({ id: client.id, assignment: a.id }) })
      .then(() => { toast(t('Workout removed')); load() }).catch(e => toast(e.message))
  })

  return <div className="card">
    <div className="row between" style={{ gap: 10, alignItems: 'flex-start' }}>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: 0 }}>{t('Training plan')}</h2>
        <div className="dim small">{lastDay ? t('{0} workouts assigned, up to {1}', ahead.length, fmtDate(lastDay, true)) : t('Nothing assigned ahead yet')}</div>
      </div>
      <button className="iconbtn" style={{ width: 44, height: 44, flexShrink: 0 }} disabled={!d}
        onClick={() => profileSheet({ client, profile: p, onSaved: profile => setD(o => ({ ...o, profile })) })} aria-label={t('Edit training profile')}><Icon name="pencil" /></button>
    </div>

    {p && (p.goal || p.limits.length || p.focus || p.days) ? <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
      {p.goal && <span className="tag acc nocap">{GOALS[p.goal]}</span>}
      {p.limits.map(l => <span key={l} className="tag warn nocap">{LIMITS[l]}</span>)}
      {p.focus && <span className="tag nocap">{FOCUS[p.focus]}</span>}
      {p.days && <span className="tag nocap">{t('{0} days/week', p.days)}</span>}
    </div> : d && <button className="linkbtn small" style={{ marginTop: 6 }} onClick={() => profileSheet({ client, profile: p, onSaved: profile => setD(o => ({ ...o, profile })) })}>
      {t('Set their goal and limitations to get model recommendations')}</button>}
    {p?.notes && <div className="dim small" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{p.notes}</div>}

    <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
      <button className="btn primary" style={{ margin: 0, flex: '1 1 180px' }} onClick={() => nav('/trainer/c/' + client.id + '/models')}>
        <Icon name="sparkles" /> {t('Training models')}</button>
      <button className="btn tinted" style={{ margin: 0, flex: '1 1 180px' }} onClick={() => assignSheet({ client, onSaved: load })}>
        <Icon name="plus" /> {t('Assign one day')}</button>
    </div>

    {list.length > 0 && <div style={{ marginTop: 10 }}>
      {list.map((a, i) => {
        const past = a.date < today
        const state = a.date === today ? (done.has(a.date) ? 'done' : 'today') : past ? (done.has(a.date) ? 'done' : 'missed') : 'next'
        return <div key={a.id} className="row between" style={{ padding: '8px 0', borderTop: '1px solid var(--sep)', gap: 8, opacity: past ? 0.75 : 1 }}>
          <button className="row" style={{ gap: 10, background: 'none', color: 'inherit', textAlign: 'left', flex: 1, minWidth: 0, padding: 0 }}
            onClick={() => assignSheet({ client, existing: a, onSaved: load })} aria-label={t('Edit {0}', a.name)}>
            <span className="small" style={{ width: 86, flexShrink: 0, fontWeight: a.date === today ? 700 : 500 }}>{a.date === today ? t('Today') : fmtDate(a.date, true)}</span>
            <span style={{ minWidth: 0 }}>
              <span className="small" style={{ fontWeight: 600, display: 'block' }}>{a.name}</span>
              <span className="dim" style={{ fontSize: '.72rem' }}>{t('{0} exercises', a.ex.length)}{a.note ? ' · ' + t('with a note') : ''}</span>
            </span>
          </button>
          {state === 'done' && <span className="tag ok nocap">{t('Done')}</span>}
          {state === 'missed' && <span className="tag bad nocap">{t('Missed')}</span>}
          {!past && <button className="iconbtn" style={{ width: 40, height: 40, fontSize: 15, color: 'var(--red)' }} onClick={() => del(a)} aria-label={t('Remove {0}', a.name)}><Icon name="trash" /></button>}
        </div>
      })}
    </div>}
  </div>
}
