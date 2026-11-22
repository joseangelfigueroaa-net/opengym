import { useState } from 'react'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { todayISO, fmtDate } from '../lib/format.js'
import { LIMITS } from '../lib/programs.js'
import { PATTERNS, RESULTS, readCheck, latestCheck } from '../lib/movement.js'
import { Button } from './ui.jsx'

// The trainer watches the client do seven patterns and marks each one. Saving adds the check to
// the profile (today's replaces an earlier one from the same day) and switches on the
// limitations that painful patterns point to, so the model list stops offering what loads them.
function MovementCheckSheet({ client, profile, onSaved, close }) {
  const toast = useUI(s => s.toast)
  const today = todayISO()
  const last = latestCheck(profile)
  const [r, setR] = useState(last?.d === today ? { ...last.r } : {})
  const [busy, setBusy] = useState(false)
  const read = readCheck({ r })
  const newLimits = read.limits.filter(l => !(profile?.limits || []).includes(l))
  const mark = (id, v) => setR(o => ({ ...o, [id]: o[id] === v ? undefined : v }))

  const save = async () => {
    if (!read.done) { toast(t('Mark at least one movement')); return }
    setBusy(true)
    const p = { goal: null, limits: [], focus: null, days: null, notes: '', ...profile }
    const clean = Object.fromEntries(Object.entries(r).filter(([, v]) => v))
    const screens = [{ d: today, r: clean }, ...(p.screens || []).filter(s => s.d !== today)]
    try {
      const res = await api('/api/trainer/client/profile', { method: 'POST', body: JSON.stringify({ id: client.id, ...p, limits: [...new Set([...p.limits, ...read.limits])], screens }) })
      toast(t('Movement check saved')); close(); onSaved && onSaved(res.profile)
    } catch (e) { setBusy(false); toast(e.message) }
  }

  return <>
    <h3>{t('Movement check')} · <span className="capitalize">{client.name.split(' ')[0]}</span></h3>
    <p className="dim small" style={{ margin: '4px 0 10px' }}>
      {t('Watch each movement once, without warming up first. Mark what you see: fine, limited (does not reach it, compensates or loses balance) or painful.')}</p>
    {last && last.d !== today && <div className="dim small" style={{ marginBottom: 8 }}>{t('Last check: {0}', fmtDate(last.d, true))}</div>}
    {PATTERNS.map((p, i) => <div key={p.id} style={{ padding: '10px 0', borderTop: i ? '1px solid var(--sep)' : 0 }}>
      <div style={{ fontWeight: 600 }}>{i + 1}. {p.name}</div>
      <div className="small" style={{ margin: '2px 0' }}>{p.how}</div>
      <div className="dim" style={{ fontSize: '.75rem', marginBottom: 6 }}>{t('Fine if')}: {p.ok}</div>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="group" aria-label={p.name}>
        {Object.entries(RESULTS).map(([k, label]) => <button key={k} type="button"
          className={'chip nocap' + (r[p.id] === k ? ' on' : '')} aria-pressed={r[p.id] === k} onClick={() => mark(p.id, k)}
          style={r[p.id] === k && k === 'pain' ? { background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' } : undefined}>{label}</button>)}
        {last && last.d !== today && last.r[p.id] && <span className="dim" style={{ fontSize: '.72rem', alignSelf: 'center' }}>{t('before')}: {RESULTS[last.r[p.id]]}</span>}
      </div>
    </div>)}

    {read.pain.length > 0 && <div className="card" style={{ background: 'var(--red-soft, rgba(255,69,58,.12))', margin: '12px 0 0' }}>
      <div style={{ fontWeight: 600 }}>{t('Refer before training this')}</div>
      <div className="small" style={{ marginTop: 4 }}>
        {t('Pain in {0}. Pain in a movement check is not trained through: send them to a doctor or physiotherapist and avoid loading that pattern until it is assessed.', read.pain.map(p => p.name.toLowerCase()).join(', '))}</div>
      {newLimits.length > 0 && <div className="small" style={{ marginTop: 6 }}>
        {t('Saving adds these limitations to the profile: {0}.', newLimits.map(l => LIMITS[l]).join(', '))}</div>}
    </div>}
    {read.limited.length > 0 && <div className="dim small" style={{ marginTop: 10 }}>
      {t('Limited without pain: {0}. That is what mobility work is for: add the joint warm-up to their sessions or use the “Mobility and joint control” model.', read.limited.map(p => p.name.toLowerCase()).join(', '))}</div>}
    <p className="dim" style={{ fontSize: '.72rem', margin: '12px 0 0' }}>
      {t('A screen, not a diagnosis. Inspired by the logic of the SFMA (Cook and Kiesel): what hurts is referred, what is limited is trained.')}</p>
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={save} disabled={busy}>{busy ? t('Saving…') : t('Save check')}</Button>
  </>
}

export function movementCheckSheet(opts) {
  return useUI.getState().openSheet(close => <MovementCheckSheet {...opts} close={close} />)
}
