import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import { EXIDX } from '../lib/exercises.js'
import { modeOf } from '../lib/history.js'
import { MEASURE_ZONES } from '../lib/trainer.js'
import LineChart from './LineChart.jsx'
import { Segmented } from './ui.jsx'

// Progress charts beyond body weight (Trainnery): body fat and measurements from the records the
// client or their trainer logged, and how the load moved on the exercises trained most often.

const point = (d, y) => ({ t: new Date(d + 'T12:00:00').getTime(), y, d })
const signed = (n, unit) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmtNum(Math.abs(n)) + (unit ? ' ' + unit : '')

/** First value → last value, and the change, under a chart. `goodDown` colours a drop green. */
function Change({ pts, unit, goodDown }) {
  if (pts.length < 2) return null
  const first = pts[0].y, last = pts[pts.length - 1].y, diff = Math.round((last - first) * 10) / 10
  const good = goodDown ? diff < 0 : diff > 0
  return <div className="row between small" style={{ marginTop: 8 }}>
    <span className="muted">{fmtNum(first)} → {fmtNum(last)} {unit}</span>
    <b style={{ color: diff === 0 ? 'var(--label-2)' : good ? 'var(--green)' : 'var(--orange)' }}>{signed(diff, unit)}</b>
  </div>
}

/** Body fat % and measurements (cm), from /api/records. */
export function BodyComposition() {
  const [recs, setRecs] = useState(null)
  const [what, setWhat] = useState('fat')
  const [zone, setZone] = useState('waist')
  useEffect(() => { api('/api/records').then(d => setRecs(d.records || [])).catch(() => setRecs([])) }, [])
  if (!recs) return null
  const byDay = (a, b) => (a.d < b.d ? -1 : 1)
  const fat = recs.filter(r => r.kind === 'fat' && r.v.pct != null).sort(byDay).map(r => point(r.d, r.v.pct))
  const zones = MEASURE_ZONES.filter(([k]) => recs.some(r => r.kind === 'measures' && r.v[k] != null))
  const curZone = zones.some(([k]) => k === zone) ? zone : zones[0]?.[0]
  const cm = curZone ? recs.filter(r => r.kind === 'measures' && r.v[curZone] != null).sort(byDay).map(r => point(r.d, r.v[curZone])) : []
  if (!fat.length && !zones.length) return null

  const pts = what === 'fat' ? fat : cm
  const unit = what === 'fat' ? '%' : 'cm'
  return <div className="card">
    <h2>{t('Body composition')}</h2>
    <Segmented className="seg-range" value={what} onChange={setWhat}
      options={[{ value: 'fat', label: t('Body fat') }, { value: 'measures', label: t('Measures') }]} />
    {what === 'measures' && zones.length > 0 && <div className="chips" style={{ margin: '0 0 8px' }} role="group" aria-label={t('Zone')}>
      {zones.map(([k, label]) => <button key={k} type="button" className={'chip nocap' + (curZone === k ? ' on' : '')} aria-pressed={curZone === k} onClick={() => setZone(k)}>{t(label)}</button>)}
    </div>}
    {pts.length > 1
      ? <><div className="chart"><LineChart points={pts} h={150} unit={unit} color="var(--orange)" /></div>
        {/* body fat and waist, hips and thighs usually go the right way down; chest and arms up */}
        <Change pts={pts} unit={unit} goodDown={what === 'fat' || ['waist', 'hip', 'thigh'].includes(curZone)} /></>
      : <div className="empty small">{pts.length === 1 ? t('One record so far — the curve starts with the next one.') : t('Nothing logged yet.')}</div>}
  </div>
}

/** The exercises trained most often, one small curve each: top weight per session. */
export function TopLifts({ S, count = 4, onOpen }) {
  const sessions = {}
  for (const w of S.workouts) for (const e of w.entries || []) {
    if (!EXIDX[e.id] || modeOf({ ...(e.target || {}), id: e.id }) !== 'reps') continue
    const top = Math.max(0, ...(e.sets || []).filter(s => s.done).map(s => s.w || 0))
    if (top > 0) (sessions[e.id] || (sessions[e.id] = [])).push({ t: w.start || new Date(w.d).getTime(), y: top, d: w.d })
  }
  const top = Object.entries(sessions).filter(([, s]) => s.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, count)
  if (!top.length) return null
  return <div className="card">
    <h2>{t('Most trained exercises')}</h2>
    <div className="dim small" style={{ marginTop: -4, marginBottom: 6 }}>{t('Heaviest set per workout')}</div>
    {top.map(([id, pts], i) => {
      const first = pts[0].y, last = pts[pts.length - 1].y, diff = Math.round((last - first) * 10) / 10
      const pct = first ? Math.round(diff / first * 100) : 0
      return <button key={id} type="button" onClick={() => onOpen && onOpen(id)}
        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', color: 'inherit', padding: '10px 0', borderTop: i ? 'var(--hair) solid var(--sep)' : 'none' }}>
        <div className="row between" style={{ gap: 8 }}>
          <span className="capitalize" style={{ fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>{EXIDX[id].n}</span>
          <b style={{ flex: 'none', color: diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--orange)' : 'var(--label-2)' }}>{signed(diff, S.unit)}{pct ? ` (${pct > 0 ? '+' : ''}${pct}%)` : ''}</b>
        </div>
        <div className="small muted">{t('{0} workouts', pts.length)} · {fmtNum(first)} → {fmtNum(last)} {S.unit}</div>
        <div className="chart" style={{ marginTop: 4 }}><LineChart points={pts} h={80} unit={S.unit} color="var(--blue)" axes={false} /></div>
      </button>
    })}
  </div>
}
