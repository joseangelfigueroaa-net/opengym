import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { fmtDate, fmtNum, fmtVol, fmtDur, DAYS } from '../lib/format.js'
import { workoutVolume, setsDone } from '../lib/history.js'
import { t } from '../lib/i18n.js'
import { confirmSheet } from '../sheets.jsx'
import LineChart from '../components/LineChart.jsx'
import Icon from '../components/Icon.jsx'

// One client's file, read-only: what they logged on their own phone, as the trainer sees it.
// Nothing here writes to the client's data — the only action is ending the link.

export default function TrainerClient() {
  const nav = useNavigate()
  const { id } = useParams()
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const [c, setC] = useState(null)

  useEffect(() => {
    if (!user?.trainer) return
    api('/api/trainer/client?id=' + encodeURIComponent(id)).then(d => setC(d.client))
      .catch(e => { toast(e.message); nav('/trainer', { replace: true }) })
  }, [id, !!user?.trainer])   // the role can arrive after first render (see Trainer.jsx)
  if (!user?.trainer) return null

  const remove = () => confirmSheet({
    title: t('Remove {0}?', c.name),
    message: t('You stop seeing their progress and the seat is freed. Their own data stays with them.'),
    confirmText: t('Remove'), danger: true,
    onConfirm: () => api('/api/trainer/client/remove', { method: 'POST', body: JSON.stringify({ id }) })
      .then(() => { toast(t('{0} removed', c.name)); nav('/trainer', { replace: true }) }).catch(e => toast(e.message))
  })
  // Which weekdays each routine is planned on, from the client's weekly schedule.
  const daysOf = rid => Object.entries(c.week || {}).filter(([, r]) => r === rid).map(([d]) => t(DAYS[+d])).join(' · ')
  const points = c ? c.bodyweight.slice(-60).map(b => ({ t: b.t || new Date(b.d).getTime(), y: b.w, d: b.d })) : []

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/trainer')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 8 }}><h1 style={{ margin: 0 }} className="capitalize">{c ? c.name : '…'}</h1>
        <div className="sub">{c ? t('Client since {0}', fmtDate(c.since.slice(0, 10))) : t('Loading…')}</div></div>
    </div>
    {c && <>
      <div className="tiles" style={{ marginBottom: 12 }}>
        <div className="tile"><div className="l">{t('Body weight')}</div><div className="v">{c.weight != null ? fmtNum(c.weight) : '—'}<small> {c.weight != null ? c.unit : ''}</small></div></div>
        <div className="tile"><div className="l">{t('Last 30 days')}</div><div className="v">{c.last30}</div></div>
        <div className="tile"><div className="l">{t('Workouts')}</div><div className="v">{c.workouts}</div></div>
        <div className="tile"><div className="l">{t('Last workout')}</div><div className="v" style={{ fontSize: '.95rem' }}>{c.lastWorkout ? fmtDate(c.lastWorkout) : '—'}</div></div>
      </div>

      <div className="card">
        <h2 style={{ margin: 0 }}>{t('Body weight')}</h2>
        {points.length > 1
          ? <div className="chart" style={{ marginTop: 8 }}><LineChart points={points} h={150} unit={c.unit} goal={c.targetW} /></div>
          : <div className="dim small" style={{ marginTop: 6 }}>{t('Not enough weigh-ins for a chart yet.')}</div>}
      </div>

      <h4 className="sec">{t('Routines')}</h4>
      {c.routines.length ? <div className="card" style={{ padding: '4px 14px' }}>
        {c.routines.map((r, n) => <div key={r.id} className="row between" style={{ padding: '10px 0', borderTop: n ? '1px solid var(--sep)' : 'none' }}>
          <div><div className="small" style={{ fontWeight: 600 }}>{r.name}</div>
            <div className="dim" style={{ fontSize: '.72rem' }}>{daysOf(r.id) || t('Not on the weekly plan')}</div></div>
          <span className="small muted">{t('{0} exercises', r.count)}</span>
        </div>)}
      </div> : <div className="empty small">{t('No routines yet.')}</div>}

      <h4 className="sec">{t('Workout history')}</h4>
      {c.history.length ? <div className="list" style={{ gap: 0 }}>
        {c.history.map(w => <div key={w.id} className="row between" style={{ padding: '9px 2px', borderBottom: '1px solid var(--sep)' }}>
          <div><div className="small" style={{ fontWeight: 600 }}>{w.name}</div>
            <div className="dim" style={{ fontSize: '.72rem' }}>{fmtDate(w.d, true)} · {fmtDur((w.end || w.start) - w.start)} · {t('{0} sets', setsDone(w))}{w.prs?.length ? ' · ' + w.prs.length + ' PR' : ''}</div></div>
          <span className="small muted">{fmtVol(w.vol ?? workoutVolume(w), c.unit)}</span>
        </div>)}
      </div> : <div className="empty small">{t('No workouts logged.')}</div>}

      <button className="btn danger" style={{ margin: '20px 0 8px' }} onClick={remove}>{t('Remove client')}</button>
    </>}
  </div>
}
