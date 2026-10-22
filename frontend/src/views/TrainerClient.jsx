import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { fmtDate, fmtNum, fmtVol, fmtDur, DAYS } from '../lib/format.js'
import { workoutVolume, setsDone } from '../lib/history.js'
import { exOr } from '../lib/exercises.js'
import { t, dateLocale } from '../lib/i18n.js'
import { statusTag, recordText, deleteRecord, MEASURE_ZONES, RECORD_KINDS } from '../lib/trainer.js'
import { confirmSheet } from '../sheets.jsx'
import { recordSheet } from '../components/RecordSheet.jsx'
import TrainerPlanCard from '../components/TrainerPlanCard.jsx'
import LineChart from '../components/LineChart.jsx'
import Icon from '../components/Icon.jsx'
import { Segmented } from '../components/ui.jsx'

// One client's file, as the trainer works with it: how they're doing at a glance, their
// curves, their week, what they logged, and the trainer's own entries (weigh-ins, measures).
// The client's training data is read-only here; records the trainer adds go to the shared
// records file and show up in the client's app.

const pts = (list, key) => list.map(x => ({ t: new Date(x.d).getTime(), y: x[key], d: x.d }))
const signed = (n, unit) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmtNum(Math.abs(n)) + (unit ? ' ' + unit : '')

export default function TrainerClient() {
  const nav = useNavigate()
  const { id } = useParams()
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const [c, setC] = useState(null)
  const [metric, setMetric] = useState('weight')
  const [zone, setZone] = useState('waist')
  const [ex, setEx] = useState(null)

  const load = () => api('/api/trainer/client?id=' + encodeURIComponent(id)).then(d => setC(d.client))
    .catch(e => { toast(e.message); nav('/trainer', { replace: true }) })
  useEffect(() => { if (user?.trainer) load() }, [id, !!user?.trainer])   // the role can arrive after first render (see Trainer.jsx)
  if (!user?.trainer) return null

  const first = c ? c.name.split(' ')[0] : ''
  const exName = exId => c.customEx.find(e => e.id === exId)?.name || exOr(exId).n
  const remove = () => confirmSheet({
    title: t('Remove {0}?', c.name),
    message: t('You stop seeing their progress and the seat is freed. Their own data stays with them.'),
    confirmText: t('Remove'), danger: true,
    onConfirm: () => api('/api/trainer/client/remove', { method: 'POST', body: JSON.stringify({ id }) })
      .then(() => { toast(t('{0} removed', c.name)); nav('/trainer', { replace: true }) }).catch(e => toast(e.message))
  })
  const delRec = r => confirmSheet({
    title: t('Delete this record?'), message: recordText(r.kind, r.v) + ' · ' + fmtDate(r.d, true),
    confirmText: t('Delete'), danger: true,
    onConfirm: () => deleteRecord(r.id, id).then(() => { toast(t('Record deleted')); load() }).catch(e => toast(e.message))
  })
  const daysOf = rid => Object.entries(c.plan || {}).filter(([, r]) => r === rid).map(([d]) => t(DAYS[+d])).join(' · ')

  if (!c) return <div className="narrow"><div className="hdr">
    <button className="iconbtn" onClick={() => nav('/trainer')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
    <div style={{ flex: 1, marginLeft: 8 }}><h1 style={{ margin: 0 }}>…</h1><div className="sub">{t('Loading…')}</div></div></div></div>

  const st = statusTag(c.status)
  const w0 = c.weights[0], wl = c.weights[c.weights.length - 1]
  const f0 = c.fat[0], fl = c.fat[c.fat.length - 1]
  const exList = c.loads.filter(l => l.history.length > 0)
  const curEx = exList.find(l => l.id === ex) || exList[0]
  const chart = {
    weight: { points: pts(c.weights, 'w'), unit: c.unit, goal: c.targetW, empty: t('No weigh-ins yet.') },
    fat: { points: pts(c.fat, 'pct'), unit: '%', empty: t('No body-fat records yet.') },
    measures: { points: pts(c.measures.filter(m => m[zone] != null), zone), unit: 'cm', empty: t('No measurements yet.') },
    loads: { points: curEx ? pts(curEx.history, 'w') : [], unit: 'kg', empty: t('No logged sets yet.') }
  }[metric]

  return <div>
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/trainer')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 8, minWidth: 0 }}>
        <h1 style={{ margin: 0 }} className="capitalize">{c.name}</h1>
        <div className="sub">{t('Client since {0}', fmtDate(c.since.slice(0, 10)))} · <span className={'tag nocap ' + st.cls}>{st.text}</span></div>
      </div>
      <button className="iconbtn" onClick={() => nav('/trainer/chat/' + id)} aria-label={t('Chat with {0}', first)}><Icon name="chat" /></button>
    </div>

    <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
      <button className="btn primary" style={{ flex: '1 1 200px', margin: 0 }} onClick={() => recordSheet({ clientId: id, clientName: first, onSaved: load })}>
        <Icon name="plus" /> {t('Log for {0}', first)}</button>
      <button className="btn tinted" style={{ flex: '1 1 200px', margin: 0 }} onClick={() => recordSheet({ clientId: id, clientName: first, kind: 'weight', onSaved: load })}>
        <Icon name="scale" /> {t('Weigh in')}</button>
    </div>

    <TrainerPlanCard client={c} nav={nav} />

    <div className="tiles" style={{ marginBottom: 12 }}>
      <div className="tile"><div className="l">{t('Body weight')}</div>
        <div className="v">{wl ? fmtNum(wl.w) : '—'}<small> {wl ? c.unit : ''}</small></div>
        {w0 && wl && w0 !== wl && <div className="dim" style={{ fontSize: '.72rem' }}>{t('{0} since the start', signed(wl.w - w0.w, c.unit))}</div>}</div>
      <div className="tile"><div className="l">{t('Body fat')}</div>
        <div className="v">{fl ? fmtNum(fl.pct) : '—'}<small>{fl ? ' %' : ''}</small></div>
        {f0 && fl && f0 !== fl && <div className="dim" style={{ fontSize: '.72rem' }}>{t('{0} points', signed(fl.pct - f0.pct))}</div>}</div>
      <div className="tile"><div className="l">{t('Consistency')}</div>
        <div className="v">{c.adherence.pct != null ? c.adherence.pct : '—'}<small>{c.adherence.pct != null ? ' %' : ''}</small></div>
        <div className="dim" style={{ fontSize: '.72rem' }}>{!c.adherence.plan ? t('No weekly plan') : c.adherence.streak ? t('{0}-week streak', c.adherence.streak) : t('No streak yet')}</div></div>
      <div className="tile"><div className="l">{t('This week')}</div>
        <div className="v">{c.adherence.thisWeek}<small>{c.adherence.plan ? ' / ' + c.adherence.plan : ''}</small></div>
        <div className="dim" style={{ fontSize: '.72rem' }}>{t('workouts')}</div></div>
    </div>

    <div className="cols">
      <div>
        <div className="card">
          <h2 style={{ margin: '0 0 8px' }}>{t('Progress')}</h2>
          <Segmented value={metric} onChange={setMetric} options={[
            { value: 'weight', label: t('Weight') }, { value: 'fat', label: t('Fat') },
            { value: 'measures', label: t('Measures') }, { value: 'loads', label: t('Lifts') }]} />
          {metric === 'measures' && <select className="field" style={{ marginTop: 8 }} value={zone} onChange={e => setZone(e.target.value)} aria-label={t('Measurement')}>
            {MEASURE_ZONES.map(([k, label]) => <option key={k} value={k}>{t(label)}</option>)}</select>}
          {metric === 'loads' && exList.length > 0 && <select className="field" style={{ marginTop: 8 }} value={curEx.id} onChange={e => setEx(e.target.value)} aria-label={t('Exercise')}>
            {exList.map(l => <option key={l.id} value={l.id}>{exName(l.id)}</option>)}</select>}
          {chart.points.length > 1
            ? <div className="chart" style={{ marginTop: 10 }}><LineChart points={chart.points} h={170} unit={chart.unit} goal={chart.goal ?? null} /></div>
            : <div className="empty small" style={{ marginTop: 10 }}>{chart.points.length === 1 ? t('One record so far — the curve starts with the next one.') : chart.empty}</div>}
        </div>

        <div className="card">
          <h2 style={{ margin: '0 0 8px' }}>{t('Their week')}</h2>
          <div className="tiles" style={{ textAlign: 'left' }}>
            <div className="tile"><div className="l">{t('Steps per day')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{c.week.steps != null ? Math.round(c.week.steps).toLocaleString(dateLocale()) : '—'}</div></div>
            <div className="tile"><div className="l">{t('Sleep')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{c.week.sleep != null ? fmtNum(c.week.sleep) + ' h' : '—'}</div></div>
            <div className="tile"><div className="l">{t('Meals logged')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{c.week.meals}</div></div>
            <div className="tile"><div className="l">{t('Last workout')}</div><div className="v" style={{ fontSize: '.95rem' }}>{c.lastWorkout ? fmtDate(c.lastWorkout) : '—'}</div></div>
          </div>
          <div className="dim small" style={{ marginTop: 6 }}>{t('Averages over the last 7 days.')}</div>
        </div>

        <div className="card">
          <h2 style={{ margin: '0 0 8px' }}>{t('Measurements (cm)')}</h2>
          {Object.keys(c.measureTable).length ? <table className="dtable">
            <thead><tr><th>{t('Zone')}</th><th className="n">{t('Initial')}</th><th className="n">{t('Now')}</th><th className="n">{t('Change')}</th></tr></thead>
            <tbody>{MEASURE_ZONES.filter(([k]) => c.measureTable[k]).map(([k, label]) => {
              const m = c.measureTable[k]
              return <tr key={k}><td>{t(label)}</td><td className="n">{fmtNum(m.first)}</td><td className="n"><b>{fmtNum(m.last)}</b></td><td className="n">{signed(m.last - m.first)}</td></tr>
            })}</tbody>
          </table> : <div className="empty small">{t('No measurements yet.')}</div>}
        </div>
      </div>

      <div>
        <div className="card">
          <h2 style={{ margin: '0 0 8px' }}>{t('Recent activity')}</h2>
          {c.activity.length ? c.activity.slice(0, 12).map((a, i) => (
            <div key={i} className="row between" style={{ padding: '9px 2px', borderTop: i ? '1px solid var(--sep)' : 'none', gap: 10, alignItems: 'flex-start' }}>
              <span className="iconbtn" style={{ width: 32, height: 32, fontSize: 15, color: 'var(--acc)' }} aria-hidden="true">
                <Icon name={a.type === 'workout' ? 'dumbbell' : RECORD_KINDS[a.kind].icon} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="small" style={{ fontWeight: 600 }}>{a.type === 'workout' ? a.name : t(RECORD_KINDS[a.kind].label)}</div>
                <div className="dim" style={{ fontSize: '.75rem', overflowWrap: 'anywhere' }}>
                  {a.type === 'workout' ? t('{0} sets', a.sets) + (a.mins ? ' · ' + a.mins + ' min' : '') + (a.prs ? ' · ' + a.prs + ' PR' : '') : recordText(a.kind, a.v)}
                  {' · '}{fmtDate(a.d)}{a.type === 'record' && a.role === 'trainer' ? ' · ' + t('by you') : ''}</div>
              </div>
            </div>)) : <div className="empty small">{t('Nothing logged yet.')}</div>}
        </div>

        <div className="card">
          <h2 style={{ margin: '0 0 8px' }}>{t('Lifts')}</h2>
          {c.loads.length ? <table className="dtable">
            <thead><tr><th>{t('Exercise')}</th><th className="n">{t('Last')}</th><th className="n">{t('Best')}</th></tr></thead>
            <tbody>{c.loads.slice(0, 15).map(l => <tr key={l.id}>
              <td>{exName(l.id)}</td><td className="n">{fmtNum(l.last.w)} × {l.last.r}</td>
              <td className="n">{l.last.w >= l.best ? <span className="tag ok nocap">{fmtNum(l.best)}</span> : fmtNum(l.best)}</td></tr>)}</tbody>
          </table> : <div className="empty small">{t('No logged sets yet.')}</div>}
        </div>

        <div className="card">
          <h2 style={{ margin: '0 0 8px' }}>{t('Records')}</h2>
          {c.records.length ? c.records.slice(0, 15).map((r, i) => (
            <div key={r.id} className="row between" style={{ padding: '8px 2px', borderTop: i ? '1px solid var(--sep)' : 'none', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div className="small" style={{ overflowWrap: 'anywhere' }}><b>{t(RECORD_KINDS[r.kind].label)}</b> · {recordText(r.kind, r.v)}</div>
                <div className="dim" style={{ fontSize: '.72rem' }}>{fmtDate(r.d, true)} · {r.role === 'trainer' ? t('by you') : t('by {0}', first)}</div>
              </div>
              {r.role === 'trainer' && <button className="iconbtn" style={{ width: 44, height: 44, fontSize: 16, color: 'var(--red)' }} onClick={() => delRec(r)} aria-label={t('Delete record')}><Icon name="trash" /></button>}
            </div>)) : <div className="empty small">{t('No records yet. Log one with the button above.')}</div>}
        </div>
      </div>
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
      {c.history.slice(0, 20).map(w => <div key={w.id} className="row between" style={{ padding: '9px 2px', borderBottom: '1px solid var(--sep)' }}>
        <div><div className="small" style={{ fontWeight: 600 }}>{w.name}</div>
          <div className="dim" style={{ fontSize: '.72rem' }}>{fmtDate(w.d, true)} · {fmtDur((w.end || w.start) - w.start)} · {t('{0} sets', setsDone(w))}{w.prs?.length ? ' · ' + w.prs.length + ' PR' : ''}</div></div>
        <span className="small muted">{fmtVol(w.vol ?? workoutVolume(w), c.unit)}</span>
      </div>)}
    </div> : <div className="empty small">{t('No workouts logged.')}</div>}

    <button className="btn danger" style={{ margin: '20px 0 8px' }} onClick={remove}>{t('Remove client')}</button>
  </div>
}
