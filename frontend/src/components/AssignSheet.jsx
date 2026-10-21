import { useState } from 'react'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { exOr } from '../lib/exercises.js'
import { PROGRAMS } from '../lib/programs.js'
import ExerciseItemsEditor, { itemErrors } from './ExerciseItemsEditor.jsx'
import { Button, TextField, TextArea } from './ui.jsx'

// The trainer's editor for one day's workout: name, note, and the exercises — each with its
// mode (reps, timed, cardio), sets, rep range or time, starting weight and rest. Start from
// one of the client's routines or a session of a training model, then adjust anything.
// Sending replaces whatever that day had.

function AssignSheet({ client, existing, date: date0, onSaved, close }) {
  const toast = useUI(s => s.toast)
  const [date, setDate] = useState(existing?.date || date0 || todayISO())
  const [name, setName] = useState(existing?.name || '')
  const [note, setNote] = useState(existing?.note || '')
  const [items, setItems] = useState(existing?.ex?.map(x => ({ ...x })) || [])
  const [busy, setBusy] = useState(false)
  const first = client.name.split(' ')[0]
  const loads = Object.fromEntries(client.loads.map(l => [l.id, l]))
  const nameOf = id => client.customEx.find(c => c.id === id)?.name || exOr(id).n
  const max = new Date(Date.now() + 62 * 86400000).toISOString().slice(0, 10)
  const loadFrom = src => {
    setItems(src.ex.map(x => ({ mode: 'reps', ...x, repsMin: x.repsMin || (x.reps ? Math.max(1, x.reps - 2) : undefined) })))
    if (!name) setName(src.name)
  }

  const send = async () => {
    if (!name.trim()) { toast(t('Give the workout a name')); return }
    if (!items.length) { toast(t('Add at least one exercise')); return }
    const errs = itemErrors(items)
    if (errs.length) { toast(errs[0]); return }
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
    <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
      {client.routines.filter(r => r.ex.length).map(r => <button key={r.id} type="button" className="chip nocap" onClick={() => loadFrom(r)}>{r.name}</button>)}
      <select className="field" style={{ width: 'auto', flex: '1 1 180px' }} value="" aria-label={t('A session from a training model')}
        onChange={e => { const [pi, si] = e.target.value.split(':'); if (pi) loadFrom(PROGRAMS[+pi].sessions[+si]) }}>
        <option value="">{t('A session from a training model…')}</option>
        {PROGRAMS.map((p, pi) => <optgroup key={p.id} label={p.name}>
          {p.sessions.map((s, si) => <option key={si} value={pi + ':' + si}>{s.name}</option>)}</optgroup>)}
      </select>
    </div>

    <ExerciseItemsEditor items={items} onChange={setItems} nameOf={nameOf} loads={loads} unit={client.unit} customEx={client.customEx} />

    <label className="small muted" style={{ display: 'grid', gap: 4, marginTop: 12 }}>{t('Note for {0} (optional)', first)}
      <TextArea rows={2} maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder={t('E.g. lower slowly on the squat, 3 seconds')} /></label>
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={send} disabled={busy}>{busy ? t('Sending…') : t('Send to {0}', first)}</Button>
  </>
}

export function assignSheet(opts) {
  return useUI.getState().openSheet(close => <AssignSheet {...opts} close={close} />)
}
