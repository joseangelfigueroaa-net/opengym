import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { RECORD_KINDS, MEALS, MACROS, saveRecord, recordKindsFor } from '../lib/trainer.js'
import { useFeatures } from '../lib/features.js'
import Icon from './Icon.jsx'
import { Button, NumberField, TextArea } from './ui.jsx'

// Log one record — body weight, fat, measurements, steps, sleep or a meal — for yourself or,
// with `clientId`, for one of your clients. A client's own weight goes to their body-weight log
// (what Home, Stats and workouts read); everything else, and anything a trainer logs, goes to
// the shared records file both of them see.
function RecordSheet({ clientId, clientName, kind: fixedKind, onSaved, close }) {
  const toast = useUI(s => s.toast)
  const update = useStore(s => s.update)
  const [kind, setKind] = useState(fixedKind || null)
  const [d, setD] = useState(todayISO())
  const [v, setV] = useState({})
  const [meal, setMeal] = useState('lunch')
  const [busy, setBusy] = useState(false)
  const set = (k, n) => setV(o => ({ ...o, [k]: n }))
  const features = useFeatures()

  const save = async () => {
    const vals = kind === 'meal' ? { meal, text: (v.text || '').trim(), ...Object.fromEntries(MACROS.filter(([k]) => v[k] != null).map(([k]) => [k, v[k]])) } : Object.fromEntries(Object.entries(v).filter(([, n]) => n != null && n !== ''))
    if (kind !== 'meal' && !Object.keys(vals).length) { toast(t('Enter at least one value')); return }
    if (kind === 'meal' && !vals.text) { toast(t('Describe what was eaten')); return }
    setBusy(true)
    try {
      if (kind === 'weight' && !clientId) {
        update(s => {
          const ex = s.bodyweight.find(b => b.d === d)
          if (ex) { ex.w = vals.kg; ex.t = Date.now() } else s.bodyweight.push({ d, w: vals.kg, t: Date.now() })
          s.bodyweight.sort((a, b) => (a.d < b.d ? -1 : 1))
        })
      } else await saveRecord({ kind, d, v: vals }, clientId)
      toast(clientName ? t('Saved to {0}’s file', clientName) : t('Saved'))
      close()
      onSaved && onSaved()
    } catch (e) { setBusy(false); toast(e.message) }
  }

  if (!kind) return <>
    <h3>{clientName ? t('Log for {0}', clientName) : t('What do you want to log?')}</h3>
    <div className="list" style={{ gap: 8, marginTop: 10 }}>
      {recordKindsFor(features).map(([k, def]) => (
        <button key={k} className="card row" style={{ gap: 12, textAlign: 'left', margin: 0, width: '100%', color: 'inherit' }} onClick={() => setKind(k)}>
          <span className="iconbtn" style={{ color: 'var(--acc)' }} aria-hidden="true"><Icon name={def.icon} /></span>
          <span style={{ fontWeight: 600 }}>{t(def.label)}</span>
        </button>
      ))}
    </div>
  </>

  const def = RECORD_KINDS[kind]
  return <>
    <h3>{t(def.label)}{clientName ? ' · ' + clientName : ''}</h3>
    <label className="small muted" htmlFor="rec-date" style={{ display: 'block', margin: '10px 0 4px' }}>{t('Date')}</label>
    <input id="rec-date" type="date" className="field" value={d} max={todayISO()} onChange={e => setD(e.target.value || todayISO())} />
    {kind === 'meal' ? <>
      <div className="small muted" style={{ margin: '12px 0 6px' }}>{t('Which meal')}</div>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="group" aria-label={t('Which meal')}>
        {MEALS.map(([k, label]) => <button key={k} type="button" className={'chip nocap' + (meal === k ? ' on' : '')} aria-pressed={meal === k} onClick={() => setMeal(k)}>{t(label)}</button>)}
      </div>
      <label className="small muted" htmlFor="rec-meal" style={{ display: 'block', margin: '12px 0 4px' }}>{t('What was eaten?')}</label>
      <TextArea id="rec-meal" rows={3} maxLength={300} placeholder={t('E.g. 2 arepas with shredded chicken and avocado')} value={v.text || ''} onChange={e => set('text', e.target.value)} />
      {features.includes('macros') && <>
        <div className="small muted" style={{ margin: '12px 0 6px' }}>{t('Macros (optional)')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {MACROS.map(([k, label, unit]) => <label key={k} className="small muted" style={{ display: 'grid', gap: 4 }}>
            <span>{t(label)} ({unit})</span>
            <NumberField className="field" value={v[k] ?? null} nullable decimal={false} onChange={n => set(k, n)} aria-label={t(label)} />
          </label>)}
        </div>
      </>}
    </> : <div style={{ display: 'grid', gridTemplateColumns: def.fields.length > 1 ? '1fr 1fr' : '1fr', gap: 10, marginTop: 12 }}>
      {def.fields.map(([k, label, unit]) => (
        <label key={k} className="small muted" style={{ display: 'grid', gap: 4 }}>
          <span>{t(label)}{unit ? ' (' + unit + ')' : ''}</span>
          <NumberField className="field" value={v[k] ?? null} nullable decimal={kind !== 'steps'} onChange={n => set(k, n)} aria-label={t(label)} />
        </label>
      ))}
    </div>}
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={save} disabled={busy}>{busy ? t('Saving…') : t('Save')}</Button>
    {!fixedKind && <><div style={{ height: 8 }} /><Button variant="ghost" className="dim" onClick={() => { setKind(null); setV({}) }}>{t('Choose something else')}</Button></>}
  </>
}

export function recordSheet(opts = {}) {
  return useUI.getState().openSheet(close => <RecordSheet {...opts} close={close} />)
}
