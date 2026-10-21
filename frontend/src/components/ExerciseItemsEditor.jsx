import { useMemo, useState } from 'react'
import { t } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import { EXDB, exOr, isCardio } from '../lib/exercises.js'
import { defaultIncrement } from '../lib/progression.js'
import { EX_NOTES } from '../lib/programs.js'
import Icon from './Icon.jsx'
import { NumberField, TextField, Segmented } from './ui.jsx'

// The list of exercises in one session, as a trainer edits it — in a model before laying it
// over the calendar, or in a single assigned day. Each exercise has a mode (reps, a timed hold,
// or cardio) and the fields that mode needs, an optional starting weight and its own rest.
// Rows can be reordered, removed, and new exercises found by name.

export const MAX_ITEMS = 20

/** A sensible first prescription for an exercise picked from the library. */
export function newItem(id) {
  if (isCardio(id)) return { id, mode: 'cardio', sets: 1, min: 20 }
  return { id, mode: 'reps', sets: 3, repsMin: 8, reps: 12 }
}

/** What the client's next set should be, from their latest top set (`loads` from the file). */
export function suggestFor(load, item, unit = 'kg') {
  if ((item.mode || 'reps') !== 'reps') return null
  if (!load) return item.weight ? { text: `${fmtNum(item.weight)} ${unit} × ${item.repsMin}`, first: true } : { text: t('first time'), first: true }
  const { w, r } = load.last
  if (r >= item.reps) return { text: `${fmtNum(w + defaultIncrement(item.id, unit))} ${unit} × ${item.repsMin}`, up: true }
  return { text: `${fmtNum(w)} ${unit} × ${Math.min(item.reps, Math.max(item.repsMin, r + 1))}` }
}

/** Problems that would make the server refuse the session; [] when it is fine. */
export function itemErrors(items) {
  return items.flatMap((x, i) => {
    const n = i + 1
    if ((x.mode || 'reps') === 'reps') {
      if (!(x.sets >= 1) || !(x.reps >= 1) || !(x.repsMin >= 1)) return [t('Exercise {0}: fill sets and reps', n)]
      if (x.repsMin > x.reps) return [t('Exercise {0}: minimum reps above the maximum', n)]
    } else if (x.mode === 'time') {
      if (!(x.sets >= 1) || !(x.sec >= 5)) return [t('Exercise {0}: fill sets and seconds (5 or more)', n)]
    } else if (!(x.min >= 0.5)) return [t('Exercise {0}: fill the minutes', n)]
    return []
  })
}

const Num = ({ label, value, onChange, decimal = false, suffix }) => (
  <label className="small muted" style={{ display: 'grid', gap: 4, minWidth: 0 }}>
    <span>{label}{suffix ? ' (' + suffix + ')' : ''}</span>
    <NumberField className="field" decimal={decimal} nullable value={value ?? null} onChange={onChange} aria-label={label} />
  </label>
)

export default function ExerciseItemsEditor({ items, onChange, nameOf, loads = {}, unit = 'kg', customEx = [] }) {
  const [q, setQ] = useState('')
  const name = id => (nameOf ? nameOf(id) : exOr(id).n)
  const set = (i, patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const move = (i, d) => { const l = [...items]; [l[i], l[i + d]] = [l[i + d], l[i]]; onChange(l) }
  const remove = i => onChange(items.filter((_, j) => j !== i))
  const add = id => { if (items.length < MAX_ITEMS) onChange([...items, newItem(id)]); setQ('') }
  const setMode = (i, mode) => {
    const x = items[i]
    const base = { id: x.id, mode, rest: x.rest }
    set(i, mode === 'reps' ? { ...base, sets: x.sets || 3, repsMin: 8, reps: 12, sec: undefined, min: undefined, speed: undefined }
      : mode === 'time' ? { ...base, sets: x.sets || 3, sec: 30, reps: undefined, repsMin: undefined, min: undefined, speed: undefined }
      : { ...base, sets: 1, min: 20, reps: undefined, repsMin: undefined, sec: undefined, weight: undefined })
  }

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    const own = customEx.filter(c => c.name.toLowerCase().includes(s)).map(c => ({ id: c.id, n: c.name }))
    return [...own, ...EXDB.filter(e => e.n.toLowerCase().includes(s))].slice(0, 8)
  }, [q])

  return <div>
    <div className="list" style={{ gap: 8 }}>
      {items.map((x, i) => {
        const mode = x.mode || 'reps'
        const sg = suggestFor(loads[x.id], x, unit)
        return <div key={i} className="card" style={{ margin: 0, padding: 12 }}>
          <div className="row between" style={{ gap: 8, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }} className="capitalize">{i + 1}. {name(x.id)}</div>
              {sg && <div className="dim" style={{ fontSize: '.72rem' }}>{t('Suggested')}: <b className={sg.up ? 'up' : ''}>{sg.text}</b>{sg.up ? ' · ' + t('top of the range last time') : ''}</div>}
              {EX_NOTES[x.id] && <div className="dim" style={{ fontSize: '.72rem', marginTop: 2 }}>{EX_NOTES[x.id]}</div>}
            </div>
            <div className="row" style={{ gap: 2, flexShrink: 0 }}>
              <button type="button" className="iconbtn" style={{ width: 36, height: 36 }} disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('Move up')}><Icon name="chevronUp" /></button>
              <button type="button" className="iconbtn" style={{ width: 36, height: 36 }} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={t('Move down')}><Icon name="chevronDown" /></button>
              <button type="button" className="iconbtn" style={{ width: 36, height: 36, color: 'var(--red)' }} onClick={() => remove(i)} aria-label={t('Remove {0}', name(x.id))}><Icon name="trash" /></button>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <Segmented value={mode} onChange={m => setMode(i, m)} options={[
              { value: 'reps', label: t('Reps') }, { value: 'time', label: t('Time') }, { value: 'cardio', label: t('Cardio') }]} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(92px,1fr))', gap: 8, marginTop: 8 }}>
            {mode === 'reps' && <>
              <Num label={t('Sets')} value={x.sets} onChange={n => set(i, { sets: n })} />
              <Num label={t('Min reps')} value={x.repsMin} onChange={n => set(i, { repsMin: n })} />
              <Num label={t('Max reps')} value={x.reps} onChange={n => set(i, { reps: n })} />
              <Num label={t('Weight')} suffix={unit} decimal value={x.weight} onChange={n => set(i, { weight: n || undefined })} />
            </>}
            {mode === 'time' && <>
              <Num label={t('Sets')} value={x.sets} onChange={n => set(i, { sets: n })} />
              <Num label={t('Seconds')} value={x.sec} onChange={n => set(i, { sec: n })} />
              <Num label={t('Weight')} suffix={unit} decimal value={x.weight} onChange={n => set(i, { weight: n || undefined })} />
            </>}
            {mode === 'cardio' && <>
              <Num label={t('Rounds')} value={x.sets} onChange={n => set(i, { sets: n })} />
              <Num label={t('Minutes')} decimal value={x.min} onChange={n => set(i, { min: n })} />
              <Num label={t('Speed')} suffix="km/h" decimal value={x.speed} onChange={n => set(i, { speed: n || undefined })} />
            </>}
            <Num label={t('Rest')} suffix="s" value={x.rest} onChange={n => set(i, { rest: n || undefined })} />
          </div>
        </div>
      })}
    </div>
    {!items.length && <div className="empty small">{t('No exercises yet. Search below to add one.')}</div>}

    <label className="small muted" style={{ display: 'grid', gap: 4, marginTop: 12 }}>{t('Add an exercise')}
      <TextField type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search by name, e.g. squat, row…')} autoComplete="off" /></label>
    {hits.length > 0 && <div className="card" style={{ padding: '2px 12px', marginTop: 6 }}>
      {hits.map((h, i) => <button key={h.id} type="button" className="row between" onClick={() => add(h.id)}
        style={{ width: '100%', padding: '10px 0', borderTop: i ? '1px solid var(--sep)' : 'none', background: 'none', textAlign: 'left', color: 'inherit' }}>
        <span className="capitalize">{h.n}</span><Icon name="plus" className="dim" /></button>)}
    </div>}
    {items.length >= MAX_ITEMS && <div className="dim small" style={{ marginTop: 6 }}>{t('Up to {0} exercises per session.', MAX_ITEMS)}</div>}
  </div>
}
