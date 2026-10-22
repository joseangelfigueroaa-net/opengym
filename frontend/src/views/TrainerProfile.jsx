import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { METHODS } from '../lib/programs.js'
import { Button, NumberField, TextArea, TextField } from '../components/ui.jsx'
import TrainerProfileView, { profileIsEmpty } from '../components/TrainerProfileView.jsx'
import Icon from '../components/Icon.jsx'

// A trainer's "My profile" (Trainnery): their story, certifications, experience, favourite
// methodologies and a free description — what their clients see under "My trainer".
export default function TrainerProfile() {
  const nav = useNavigate()
  const toast = useUI(s => s.toast)
  const [profile, setProfile] = useState(null)
  const [edit, setEdit] = useState(null)       // the draft while editing
  const [busy, setBusy] = useState(false)
  useEffect(() => { api('/api/trainer/profile').then(r => setProfile(r.profile)).catch(e => toast(e.message)) }, [])

  const save = async () => {
    setBusy(true)
    try {
      const r = await api('/api/trainer/profile', { method: 'POST', body: JSON.stringify(edit) })
      setProfile(r.profile); setEdit(null); toast(t('Profile saved'))
    } catch (e) { toast(e.message) }
    setBusy(false)
  }

  return <div className="narrow">
    <div className="hdr">
      <div style={{ flex: 1 }}><h1 style={{ margin: 0 }}>{t('My profile')}</h1>
        <div className="sub">{t('What your clients see about you')}</div></div>
      <button className="iconbtn" onClick={() => nav('/settings')} aria-label={t('Settings')}><Icon name="gear" /></button>
    </div>

    {!profile ? <div className="muted small">{t('Loading…')}</div>
      : edit ? <ProfileForm draft={edit} setDraft={setEdit} busy={busy} onSave={save} onCancel={() => setEdit(null)} />
      : <>
        {profileIsEmpty(profile) && <div className="card small" style={{ borderColor: 'var(--acc)' }}>
          {t('Tell your clients who you are: your story, certifications and how you like to train.')}</div>}
        <TrainerProfileView profile={profile} />
        <Button variant="primary" icon="pencil" onClick={() => setEdit({ ...profile, certifications: [...profile.certifications], methods: [...profile.methods] })}>{t('Edit profile')}</Button>
      </>}
  </div>
}

function ProfileForm({ draft: d, setDraft, busy, onSave, onCancel }) {
  const [cert, setCert] = useState('')
  const [method, setMethod] = useState('')
  const set = (k, v) => setDraft(o => ({ ...o, [k]: v }))
  const addTo = (k, v, clear) => { v = v.trim(); if (v && !d[k].includes(v)) set(k, [...d[k], v]); clear('') }
  const toggle = name => set('methods', d.methods.includes(name) ? d.methods.filter(m => m !== name) : [...d.methods, name])
  const field = (label, input, hint) => <label className="small muted" style={{ display: 'grid', gap: 6, marginTop: 14 }}>{label}{input}
    {hint && <span className="dim" style={{ fontSize: 12 }}>{hint}</span>}</label>
  const onEnter = fn => e => { if (e.key === 'Enter') { e.preventDefault(); fn() } }

  // no card around the form: fields and chips use the card colour, so they stand out on the page
  return <div>
    {field(t('Name'), <TextField value={d.name} maxLength={60} onChange={e => set('name', e.target.value)} autoComplete="name" />)}
    <div className="row" style={{ gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>{field(t('Age'), <NumberField className="field" decimal={false} nullable value={d.age} onChange={v => set('age', v)} />)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>{field(t('Years of experience'), <NumberField className="field" decimal={false} nullable value={d.years} onChange={v => set('years', v)} />)}</div>
    </div>
    {field(t('My story as a trainer'), <TextArea rows={5} maxLength={2000} value={d.story} onChange={e => set('story', e.target.value)}
      placeholder={t('How you started, who you have trained, what drives you…')} />)}

    <div className="small muted" style={{ marginTop: 14 }}>{t('Certifications')}</div>
    {d.certifications.map(c => <div key={c} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid var(--sep)', gap: 8 }}>
      <span style={{ overflowWrap: 'anywhere' }}>{c}</span>
      <button type="button" className="iconbtn" style={{ color: 'var(--red)' }} onClick={() => set('certifications', d.certifications.filter(x => x !== c))} aria-label={t('Remove {0}', c)}><Icon name="trash" /></button>
    </div>)}
    <div className="row" style={{ gap: 8, marginTop: 8 }}>
      <TextField value={cert} maxLength={120} onChange={e => setCert(e.target.value)} onKeyDown={onEnter(() => addTo('certifications', cert, setCert))}
        placeholder={t('e.g. NSCA-CPT, degree in sports science…')} aria-label={t('Add a certification')} style={{ flex: 1, minWidth: 0 }} />
      <Button size="sm" icon="plus" disabled={!cert.trim() || d.certifications.length >= 15} onClick={() => addTo('certifications', cert, setCert)} style={{ width: 'auto', margin: 0 }}>{t('Add')}</Button>
    </div>

    <div className="small muted" style={{ marginTop: 16 }}>{t('Favourite methodologies')}</div>
    <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 8 }} role="group" aria-label={t('Favourite methodologies')}>
      {[...Object.values(METHODS).map(m => m.name), ...d.methods.filter(m => !Object.values(METHODS).some(x => x.name === m))].map(name =>
        <button key={name} type="button" className={'chip nocap' + (d.methods.includes(name) ? ' on' : '')} aria-pressed={d.methods.includes(name)} onClick={() => toggle(name)}>{name}</button>)}
    </div>
    <div className="row" style={{ gap: 8, marginTop: 8 }}>
      <TextField value={method} maxLength={120} onChange={e => setMethod(e.target.value)} onKeyDown={onEnter(() => addTo('methods', method, setMethod))}
        placeholder={t('Another one, e.g. CrossFit, Pilates…')} aria-label={t('Add a methodology')} style={{ flex: 1, minWidth: 0 }} />
      <Button size="sm" icon="plus" disabled={!method.trim() || d.methods.length >= 15} onClick={() => addTo('methods', method, setMethod)} style={{ width: 'auto', margin: 0 }}>{t('Add')}</Button>
    </div>

    {field(t('Free description'), <TextArea rows={6} maxLength={3000} value={d.about} onChange={e => set('about', e.target.value)}
      placeholder={t('Anything else you want your clients to know: your approach, schedule, specialties, a message…')} />,
      t('{0} of {1} characters', d.about.length, 3000))}

    <div style={{ height: 16 }} />
    <Button variant="primary" onClick={onSave} disabled={busy || !d.name.trim()}>{busy ? t('Saving…') : t('Save profile')}</Button>
    <div style={{ height: 8 }} />
    <Button onClick={onCancel} disabled={busy}>{t('Cancel')}</Button>
  </div>
}
