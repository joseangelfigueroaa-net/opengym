import { useMemo, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { todayISO, fmtNum } from '../lib/format.js'
import { EXDB, exOr } from '../lib/exercises.js'
import { defaultIncrement } from '../lib/progression.js'
import { PROGRAMS, EX_NOTES } from '../lib/programs.js'
import Icon from './Icon.jsx'
import { Button, NumberField, TextField, TextArea } from './ui.jsx'

// The trainer's editor for one day's workout: name, note, exercises with sets and a rep range,
// and what weight each one suggests from the client's own history (double progression, the
// rule the client's app applies when they start). Start from one of the client's routines or a
// session of a training model, then adjust. Sending replaces whatever that day had.

/** What the client's next set should be, from their latest top set (`loads` from the file). */
export function suggestFor(load, item, unit = 'kg') {
  if (!load) return { text: t('first time'), first: true }
  const { w, r } = load.last
  if (r >= item.reps) {
    const inc = defaultIncrement(item.id, unit)
    return { text: `${fmtNum(w + inc)} ${unit} × ${item.repsMin}`, up: true }
  }
  return { text: `${fmtNum(w)} ${unit} × ${Math.min(item.reps, Math.max(item.repsMin, r + 1))}` }
}

const MAX = 20
const blank = id => ({ id, sets: 3, repsMin: 8, reps: 12 })

function AssignSheet({ client, existing, date: date0, onSaved, close }) {
  const toast = useUI(s => s.toast)
  const [date, setDate] = useState(existing?.date || date0 || todayISO())
  const [name, setName] = useState(existing?.name || '')
  const [note, setNote] = useState(existing?.note || '')
  const [items, setItems] = useState(existing?.ex?.map(x => ({ ...x })) || [])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const first = client.name.split(' ')[0]
  const loads = Object.fromEntries(client.loads.map(l => [l.id, l]))
  const nameOf = id => client.customEx.find(c => c.id === id)?.name || exOr(id).n
  const max = new Date(Date.now() + 62 * 86400000).toISOString().slice(0, 10)

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    const own = client.customEx.filter(c => c.name.toLowerCase().includes(s)).map(c => ({ id: c.id, n: c.name }))
    return [...own, ...EXDB.filter(e => e.bp !== 'cardio' && e.n.toLowerCase().includes(s))].slice(0, 8)
  }, [q])

  const set = (i, k, v) => setItems(list => list.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const move = (i, d) => setItems(list => { const l = [...list]; [l[i], l[i + d]] = [l[i + d], l[i]]; return l })
  const add = id => { if (items.length >= MAX) return; setItems(l => [...l, blank(id)]); setQ('') }
  const loadFrom = src => { setItems(src.ex.map(x => ({ id: x.id, sets: x.sets, repsMin: x.repsMin || Math.max(1, x.reps - 2), reps: x.reps }))); if (!name) setName(src.name) }

  const send = async () => {
    if (!name.trim()) { toast(t('Give the workout a name')); return }
    if (!items.length) { toast(t('Add at least one exercise')); return }
    const bad = items.findIndex(x => !(x.sets >= 1) || !(x.reps >= 1) || !(x.repsMin >= 1) || x.repsMin > x.reps)
    if (bad >= 0) { toast(t('Check the sets and rep range of exercise {0}', bad + 1)); return }
    setBusy(true)
    try {
      await api('/api/trainer/client/assign', { method: 'POST', body: JSON.stringify({ id: client.id, date, name, note, ex: items }) })
      toast(t('Sent to {0}', first))
      close(); onSaved && onSaved()
    } catch (e) { setBusy(false); toast(e.message) }
  }

  return <>
    <h3>{existing ? t('Edit workout') : t('Assign a workout')} · <span className="capitalize">{first}</span></h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
      <label className="small muted" style={{ display: 'grid', gap: 4 }}>{t('Date')}
        <input type="date" className="field" value={date} min={todayISO()} max={max} onChange={e => setDate(e.target.value || todayISO())} /></label>
      <label className="small muted" style={{ display: 'grid', gap: 4 }}>{t('Name of the day')}
        <TextField maxLength={40} value={name} onChange={e => setName(e.target.value)} placeholder={t('E.g. Legs: quads')} /></label>
    </div>

    <div className="small muted" style={{ margin: '12px 0 6px' }}>{t('Start from')}</div>
    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
      {client.routines.filter(r => r.ex.length).map(r => <button key={r.id} type="button" className="chip nocap" onClick={() => loadFrom(r)}>{r.name}</button>)}
      <select className="field" style={{ width: 'auto', flex: '1 1 180px' }} value="" aria-label={t('A session from a training model')}
        onChange={e => { const [pi, si] = e.target.value.split(':'); if (pi) loadFrom(PROGRAMS[+pi].sessions[+si]) }}>
        <option value="">{t('A session from a training model…')}</option>
        {PROGRAMS.map((p, pi) => <optgroup key={p.id} label={p.name}>
          {p.sessions.map((s, si) => <option key={si} value={pi + ':' + si}>{s.name}</option>)}</optgroup>)}
      </select>
    </div>

    <div className="list" style={{ gap: 8, marginTop: 12 }}>
      {items.map((x, i) => {
        const sg = suggestFor(loads[x.id], x, client.unit)
        return <div key={i} className="card" style={{ margin: 0, padding: 12 }}>
          <div className="row between" style={{ gap: 8, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }} className="capitalize">{i + 1}. {nameOf(x.id)}</div>
              <div className="dim" style={{ fontSize: '.72rem' }}>{t('Suggested')}: <b className={sg.up ? 'up' : ''}>{sg.text}</b>{sg.up ? ' · ' + t('top of the range last time') : ''}</div>
              {EX_NOTES[x.id] && <div className="dim" style={{ fontSize: '.72rem', marginTop: 2 }}>{EX_NOTES[x.id]}</div>}
            </div>
            <div className="row" style={{ gap: 2, flexShrink: 0 }}>
              <button type="button" className="iconbtn" style={{ width: 36, height: 36 }} disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('Move up')}><Icon name="chevronUp" /></button>
              <button type="button" className="iconbtn" style={{ width: 36, height: 36 }} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={t('Move down')}><Icon name="chevronDown" /></button>
              <button type="button" className="iconbtn" style={{ width: 36, height: 36, color: 'var(--red)' }} onClick={() => setItems(l => l.filter((_, j) => j !== i))} aria-label={t('Remove {0}', nameOf(x.id))}><Icon name="trash" /></button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
            {[['sets', t('Sets')], ['repsMin', t('Min reps')], ['reps', t('Max reps')]].map(([k, label]) => (
              <label key={k} className="small muted" style={{ display: 'grid', gap: 4 }}>{label}
                <NumberField className="field" decimal={false} value={x[k]} onChange={n => set(i, k, n)} aria-label={label} /></label>))}
          </div>
        </div>
      })}
    </div>
    {!items.length && <div className="empty small">{t('No exercises yet. Search below or start from a routine or a model.')}</div>}

    <label className="small muted" htmlFor="as-search" style={{ display: 'block', margin: '12px 0 4px' }}>{t('Add an exercise')}</label>
    <TextField id="as-search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search by name, e.g. squat, row…')} autoComplete="off" />
    {hits.length > 0 && <div className="card" style={{ padding: '2px 12px', marginTop: 6 }}>
      {hits.map((h, i) => <button key={h.id} type="button" className="row between" onClick={() => add(h.id)}
        style={{ width: '100%', padding: '10px 0', borderTop: i ? '1px solid var(--sep)' : 'none', background: 'none', textAlign: 'left', color: 'inherit' }}>
        <span className="capitalize">{h.n}</span><Icon name="plus" className="dim" /></button>)}
    </div>}

    <label className="small muted" style={{ display: 'grid', gap: 4, marginTop: 12 }}>{t('Note for {0} (optional)', first)}
      <TextArea rows={2} maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder={t('E.g. lower slowly on the squat, 3 seconds')} /></label>
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={send} disabled={busy}>{busy ? t('Sending…') : t('Send to {0}', first)}</Button>
  </>
}

export function assignSheet(opts) {
  return useUI.getState().openSheet(close => <AssignSheet {...opts} close={close} />)
}
