import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { todayISO, fmtDate, DAYS } from '../lib/format.js'
import { exOr } from '../lib/exercises.js'
import { PROGRAMS, EX_NOTES, GOALS, LIMITS, FOCUS, fitScore, layOut } from '../lib/programs.js'
import { conceptById } from '../lib/knowledge.js'
import { profileSheet } from '../components/ProfileSheet.jsx'
import Icon from '../components/Icon.jsx'
import { Button, TextArea } from '../components/ui.jsx'

// Training models for one client: ranked against their profile (goal, limitations, focus,
// days), each with the reasoning and references behind it, and laid over up to a month of
// their calendar in one go. Models that clash with a limitation are hidden unless asked for.

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export default function TrainerPrograms() {
  const nav = useNavigate()
  const { id } = useParams()
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const [c, setC] = useState(null)
  const [profile, setProfile] = useState(null)
  const [existing, setExisting] = useState([])
  const [open, setOpen] = useState(null)          // model id expanded
  const [pick, setPick] = useState(null)          // model id being applied
  const [all, setAll] = useState(false)
  const [plan, setPlan] = useState({ start: todayISO(), weeks: 4, weekdays: [], note: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user?.trainer) return
    api('/api/trainer/client?id=' + encodeURIComponent(id)).then(d => setC(d.client)).catch(e => { toast(e.message); nav('/trainer', { replace: true }) })
    api('/api/trainer/client/assignments?id=' + encodeURIComponent(id)).then(d => { setProfile(d.profile); setExisting(d.assignments) }).catch(() => {})
  }, [id, !!user?.trainer])
  if (!user?.trainer) return null

  const first = c ? c.name.split(' ')[0] : ''
  const ranked = PROGRAMS.map(p => ({ p, score: fitScore(p, profile) }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  const shown = all ? ranked : ranked.filter(r => r.score !== null)
  const hidden = ranked.length - ranked.filter(r => r.score !== null).length
  const best = ranked[0]?.score > 0 ? ranked[0].p.id : null
  const chosen = PROGRAMS.find(p => p.id === pick)
  const preview = chosen && plan.weekdays.length ? layOut(chosen, plan) : []
  const taken = new Set(existing.map(a => a.date))
  const max = new Date(Date.now() + 62 * 86400000).toISOString().slice(0, 10)

  const choose = p => {
    setPick(p.id)
    // the model's own days, or as many of them as the client said they can train
    const days = profile?.days && profile.days < p.weekdays.length ? p.weekdays.slice(0, profile.days) : p.weekdays
    setPlan(o => ({ ...o, weekdays: days }))
    setTimeout(() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  const toggleDay = d => setPlan(o => ({ ...o, weekdays: o.weekdays.includes(d) ? o.weekdays.filter(x => x !== d) : [...o.weekdays, d] }))
  const send = async () => {
    const items = preview.filter(d => d.date <= max)
    if (!items.length) { toast(t('Pick at least one training day')); return }
    setBusy(true)
    try {
      await api('/api/trainer/client/assign/batch', { method: 'POST', body: JSON.stringify({ id, items }) })
      toast(t('{0} workouts sent to {1}', items.length, first))
      nav('/trainer/c/' + id)
    } catch (e) { setBusy(false); toast(e.message) }
  }

  return <div>
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/trainer/c/' + id)} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 8, minWidth: 0 }}><h1 style={{ margin: 0 }}>{t('Training models')}</h1>
        <div className="sub capitalize">{c ? c.name : t('Loading…')}</div></div>
    </div>

    <div className="card">
      <div className="row between" style={{ gap: 10, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="lbl2">{t('Training profile')}</div>
          {profile && (profile.goal || profile.limits.length || profile.focus || profile.days)
            ? <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {profile.goal && <span className="tag acc nocap">{GOALS[profile.goal]}</span>}
              {profile.limits.map(l => <span key={l} className="tag warn nocap">{LIMITS[l]}</span>)}
              {profile.focus && <span className="tag nocap">{FOCUS[profile.focus]}</span>}
              {profile.days && <span className="tag nocap">{t('{0} days/week', profile.days)}</span>}
            </div>
            : <div className="dim small" style={{ marginTop: 4 }}>{t('Set their goal, limitations and your focus to get recommendations.')}</div>}
        </div>
        <button className="btn tinted" style={{ margin: 0, width: 'auto', flexShrink: 0 }} disabled={!c}
          onClick={() => profileSheet({ client: c, profile, onSaved: setProfile })}>{t('Edit')}</button>
      </div>
    </div>

    {shown.map(({ p, score }) => {
      const isOpen = open === p.id
      return <article key={p.id} className="card" style={pick === p.id ? { boxShadow: 'inset 0 0 0 2px var(--acc)' } : undefined}>
        <div className="row between" style={{ gap: 10, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0 }}>{p.name}</h2>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {p.id === best && <span className="tag ok nocap">{t('Best fit')}</span>}
              {score === null && <span className="tag bad nocap">{t('Clashes with a limitation')}</span>}
              <span className="tag nocap">{p.level}</span>
              <span className="tag nocap">{t('{0} days/week', p.days)}</span>
              <span className="tag nocap">{FOCUS[p.focus]}</span>
            </div>
          </div>
        </div>
        <p className="small" style={{ margin: '10px 0 0' }}>{p.summary}</p>
        <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button className="btn" style={{ margin: 0, flex: '1 1 160px' }} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.id)}>
            <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} /> {isOpen ? t('Hide details') : t('Rationale and sessions')}</button>
          <button className="btn primary" style={{ margin: 0, flex: '1 1 160px' }} disabled={!c} onClick={() => choose(p)}>
            <Icon name="calendar" /> {t('Use with {0}', first || '…')}</button>
        </div>
        {isOpen && <div style={{ marginTop: 12 }}>
          <div className="lbl2">{t('Rationale')}</div>
          <p className="small" style={{ margin: '4px 0 6px' }}>{p.basis}</p>
          <ul className="small dim" style={{ margin: '0 0 10px', paddingLeft: 18, display: 'grid', gap: 4 }}>
            {p.refs.map(r => <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.text}</a></li>)}
          </ul>
          <div className="lbl2">{t('Concepts behind it')}</div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', margin: '6px 0 4px' }}>
            {p.concepts.map(cid => <button key={cid} type="button" className="chip nocap" onClick={() => nav('/knowledge/' + cid)}>{conceptById[cid].title}</button>)}
          </div>
          {p.sessions.map(s => <div key={s.name} style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 600 }}>{s.name}</div>
            {s.ex.map((x, i) => <div key={i} style={{ padding: '7px 0', borderTop: '1px solid var(--sep)' }}>
              <div className="row between" style={{ gap: 8 }}>
                <span className="small capitalize" style={{ fontWeight: 500 }}>{exOr(x.id).n}</span>
                <span className="small muted" style={{ flexShrink: 0 }}>{x.sets} × {x.repsMin}–{x.reps}</span>
              </div>
              <div className="dim" style={{ fontSize: '.72rem' }}>{EX_NOTES[x.id]}</div>
            </div>)}
          </div>)}
        </div>}
      </article>
    })}
    {hidden > 0 && <button className="btn" onClick={() => setAll(v => !v)}>
      {all ? t('Hide models that clash with a limitation') : t('Show {0} models that clash with a limitation', hidden)}</button>}

    {chosen && <div id="apply" className="card" style={{ boxShadow: 'inset 0 0 0 2px var(--acc)' }}>
      <h2 style={{ margin: '0 0 4px' }}>{t('Lay it over the calendar')}</h2>
      <div className="dim small">{chosen.name} · {t('sessions rotate in order on the days you pick')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        <label className="small muted" style={{ display: 'grid', gap: 4 }}>{t('Start')}
          <input type="date" className="field" value={plan.start} min={todayISO()} max={max} onChange={e => setPlan(o => ({ ...o, start: e.target.value || todayISO() }))} /></label>
        <label className="small muted" style={{ display: 'grid', gap: 4 }}>{t('Weeks')}
          <select className="field" value={plan.weeks} onChange={e => setPlan(o => ({ ...o, weeks: +e.target.value }))}>
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{t(n === 1 ? '{0} week' : '{0} weeks', n)}</option>)}</select></label>
      </div>
      <div className="small muted" style={{ margin: '12px 0 6px' }}>{t('Training days')}</div>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="group" aria-label={t('Training days')}>
        {WEEK_ORDER.map(d => <button key={d} type="button" className={'chip' + (plan.weekdays.includes(d) ? ' on' : '')} aria-pressed={plan.weekdays.includes(d)} onClick={() => toggleDay(d)}>{t(DAYS[d])}</button>)}
      </div>
      <label className="small muted" style={{ display: 'grid', gap: 4, marginTop: 12 }}>{t('Note for {0} (optional)', first)}
        <TextArea rows={2} maxLength={300} value={plan.note} onChange={e => setPlan(o => ({ ...o, note: e.target.value }))} /></label>

      <h4 className="sec">{t('{0} workouts', preview.length)}</h4>
      {preview.length ? <div className="dtable-wrap"><table className="dtable">
        <tbody>{preview.map(d => <tr key={d.date}>
          <td>{fmtDate(d.date, true)}</td><td>{d.name}</td>
          <td className="n">{d.date > max ? <span className="tag bad nocap">{t('too far ahead')}</span> : taken.has(d.date) ? <span className="tag warn nocap">{t('replaces')}</span> : ''}</td>
        </tr>)}</tbody>
      </table></div> : <div className="empty small">{t('Pick at least one training day')}</div>}
      <div style={{ height: 12 }} />
      <Button variant="primary" onClick={send} disabled={busy || !preview.length}>{busy ? t('Sending…') : t('Send {0} workouts to {1}', preview.filter(d => d.date <= max).length, first)}</Button>
    </div>}
  </div>
}
