import { useState } from 'react'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { GOALS, LIMITS, FOCUS } from '../lib/programs.js'
import { Button, NumberField, TextArea } from './ui.jsx'
import { MACROS } from '../lib/trainer.js'
import { useFeatures } from '../lib/features.js'

// What a client's plan is built around, as the trainer sees it: goal, limitations, the split
// the trainer prefers for them, and how many days they can train. The training models are
// ranked against this.
function ProfileSheet({ client, profile, onSaved, close }) {
  const toast = useUI(s => s.toast)
  const [p, setP] = useState({ goal: null, limits: [], focus: null, days: null, notes: '', ...profile })
  const [busy, setBusy] = useState(false)
  const features = useFeatures()
  const setMacro = (k, n) => setP(o => ({ ...o, macros: { ...(o.macros || {}), [k]: n } }))
  const toggle = k => setP(o => ({ ...o, limits: o.limits.includes(k) ? o.limits.filter(x => x !== k) : [...o.limits, k] }))
  const chips = (dict, isOn, onPick, label) => <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="group" aria-label={label}>
    {Object.entries(dict).map(([k, v]) => <button key={k} type="button" className={'chip nocap' + (isOn(k) ? ' on' : '')} aria-pressed={isOn(k)} onClick={() => onPick(k)}>{v}</button>)}
  </div>
  const save = async () => {
    setBusy(true)
    try {
      const r = await api('/api/trainer/client/profile', { method: 'POST', body: JSON.stringify({ id: client.id, ...p }) })
      toast(t('Profile saved')); close(); onSaved && onSaved(r.profile)
    } catch (e) { setBusy(false); toast(e.message) }
  }
  return <>
    <h3>{t('Training profile')} · <span className="capitalize">{client.name.split(' ')[0]}</span></h3>
    <div className="small muted" style={{ margin: '12px 0 6px' }}>{t('Goal')}</div>
    {chips(GOALS, k => p.goal === k, k => setP(o => ({ ...o, goal: o.goal === k ? null : k })), t('Goal'))}
    <div className="small muted" style={{ margin: '14px 0 6px' }}>{t('Limitations')}</div>
    {chips(LIMITS, k => p.limits.includes(k), toggle, t('Limitations'))}
    <div className="small muted" style={{ margin: '14px 0 6px' }}>{t('Your focus for them')}</div>
    {chips(FOCUS, k => p.focus === k, k => setP(o => ({ ...o, focus: o.focus === k ? null : k })), t('Your focus for them'))}
    <div className="small muted" style={{ margin: '14px 0 6px' }}>{t('Days per week they can train')}</div>
    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="group" aria-label={t('Days per week they can train')}>
      {[1, 2, 3, 4, 5, 6, 7].map(n => <button key={n} type="button" className={'chip' + (p.days === n ? ' on' : '')} aria-pressed={p.days === n} onClick={() => setP(o => ({ ...o, days: o.days === n ? null : n }))}>{n}</button>)}
    </div>
    {features.includes('macros') && <>
      <div className="small muted" style={{ margin: '14px 0 6px' }}>{t('Daily macro goal')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {MACROS.map(([k, label, unit]) => <label key={k} className="small muted" style={{ display: 'grid', gap: 4 }}>
          <span>{t(label)} ({unit})</span>
          <NumberField className="field" value={p.macros?.[k] ?? null} nullable decimal={false} onChange={n => setMacro(k, n)} aria-label={t(label)} />
        </label>)}
      </div>
    </>}
    <label className="small muted" style={{ display: 'grid', gap: 4, marginTop: 14 }}>{t('Notes (injuries, preferences, schedule…)')}
      <TextArea rows={3} maxLength={500} value={p.notes} onChange={e => setP(o => ({ ...o, notes: e.target.value }))} /></label>
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={save} disabled={busy}>{busy ? t('Saving…') : t('Save')}</Button>
  </>
}

export function profileSheet(opts) {
  return useUI.getState().openSheet(close => <ProfileSheet {...opts} close={close} />)
}
