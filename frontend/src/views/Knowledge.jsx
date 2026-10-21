import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { CONCEPTS, CATEGORIES, SOURCES, conceptById } from '../lib/knowledge.js'
import { PROGRAMS } from '../lib/programs.js'
import Icon from '../components/Icon.jsx'
import { TextField } from '../components/ui.jsx'

// The knowledge area: training theory in short, searchable concepts, each with how Trainnery
// applies it and the books it comes from. /knowledge/:id opens straight on one concept (the
// training models link here). Open to trainers and clients alike.

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function Concept({ c, open, onToggle }) {
  const models = PROGRAMS.filter(p => p.concepts.includes(c.id))
  return <article className="card" id={'k-' + c.id}>
    <button className="row between" onClick={onToggle} aria-expanded={open}
      style={{ width: '100%', background: 'none', color: 'inherit', textAlign: 'left', gap: 10, padding: 0, alignItems: 'flex-start' }}>
      <span style={{ minWidth: 0 }}>
        <span className="lbl2" style={{ display: 'block' }}>{CATEGORIES[c.cat]}</span>
        <span style={{ fontWeight: 600, fontSize: 17 }}>{c.title}</span>
      </span>
      <Icon name={open ? 'chevronUp' : 'chevronDown'} className="dim" />
    </button>
    <p className="small" style={{ margin: '8px 0 0' }}>{c.summary}</p>
    {open && <>
      <ul className="small" style={{ margin: '10px 0 0', paddingLeft: 18, display: 'grid', gap: 6 }}>
        {c.points.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
      <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 12, background: 'var(--acc-soft)' }}>
        <div className="lbl2">{t('In Trainnery')}</div>
        <div className="small" style={{ marginTop: 2 }}>{c.practice}</div>
      </div>
      {models.length > 0 && <div className="dim small" style={{ marginTop: 10 }}>
        {t('Models that apply it')}: {models.map(m => m.name).join(' · ')}</div>}
      <div className="lbl2" style={{ marginTop: 12 }}>{t('Sources')}</div>
      <ul className="dim" style={{ fontSize: '.75rem', margin: '4px 0 0', paddingLeft: 18, display: 'grid', gap: 3 }}>
        {c.sources.map(s => <li key={s}><i>{SOURCES[s].title}</i>, {SOURCES[s].author}</li>)}
      </ul>
    </>}
  </article>
}

export default function Knowledge() {
  const nav = useNavigate()
  const { id } = useParams()
  const user = useStore(s => s.user)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState(null)
  const [open, setOpen] = useState(() => new Set(id ? [id] : []))

  useEffect(() => {
    if (!id || !conceptById[id]) return
    setOpen(o => new Set([...o, id]))
    setTimeout(() => document.getElementById('k-' + id)?.scrollIntoView({ block: 'start' }), 60)
  }, [id])

  const list = useMemo(() => {
    const s = norm(q.trim())
    return CONCEPTS.filter(c => (!cat || c.cat === cat) &&
      (!s || norm([c.title, c.summary, ...c.points, c.practice].join(' ')).includes(s)))
  }, [q, cat])
  const toggle = cid => setOpen(o => { const n = new Set(o); n.has(cid) ? n.delete(cid) : n.add(cid); return n })

  return <div className="narrow">
    <div className="hdr">
      {!user?.trainer && <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>}
      <div style={{ flex: 1, marginLeft: user?.trainer ? 0 : 8 }}><h1 style={{ margin: 0 }}>{t('Knowledge')}</h1>
        <div className="sub">{t('Training theory, in short, with its sources')}</div></div>
    </div>

    <TextField type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search a concept, e.g. supercompensación')} aria-label={t('Search a concept')} />
    <div className="row" style={{ gap: 6, flexWrap: 'wrap', margin: '10px 0 12px' }} role="group" aria-label={t('Category')}>
      <button type="button" className={'chip nocap' + (!cat ? ' on' : '')} aria-pressed={!cat} onClick={() => setCat(null)}>{t('All')}</button>
      {Object.entries(CATEGORIES).map(([k, v]) => <button key={k} type="button" className={'chip nocap' + (cat === k ? ' on' : '')} aria-pressed={cat === k} onClick={() => setCat(cat === k ? null : k)}>{v}</button>)}
    </div>

    {list.length ? list.map(c => <Concept key={c.id} c={c} open={open.has(c.id)} onToggle={() => toggle(c.id)} />)
      : <div className="empty small">{t('No concept matches “{0}”.', q)}</div>}

    <h4 className="sec">{t('Reference books')}</h4>
    <div className="card">
      <ul className="small dim" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 5 }}>
        {Object.values(SOURCES).map(s => <li key={s.title}><i>{s.title}</i> — {s.author}</li>)}
      </ul>
      <div className="dim" style={{ fontSize: '.72rem', marginTop: 10 }}>{t('The concepts are summaries in our own words; read the books for the full development.')}</div>
    </div>
  </div>
}
