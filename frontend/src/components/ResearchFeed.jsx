import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { fmtDate } from '../lib/format.js'
import Icon from './Icon.jsx'

// Science news for trainers: new peer-reviewed papers from PubMed by topic (api/trainer/research.js).
// Titles and conclusions stay as the authors wrote them, with the PubMed record one tap away, so
// a trainer can check every item. Papers that reached PubMed since the last visit are marked new.

const LEVELS = [
  { key: null, label: 'All' },
  { key: 'guideline', label: 'Guidelines' },
  { key: 'meta', label: 'Meta-analyses' },
  { key: 'review', label: 'Systematic reviews' },
  { key: 'rct', label: 'Randomized trials' }
]
const LEVEL_CLS = { guideline: 'acc', meta: 'ok', review: 'ok', rct: 'warn', other: '' }
const SEEN_KEY = 'trainnery.research.seen'

const readSeen = () => { try { return localStorage.getItem(SEEN_KEY) || '' } catch { return '' } }
const writeSeen = d => { try { localStorage.setItem(SEEN_KEY, d) } catch { /* private mode: nothing is marked new next time */ } }

function Paper({ it, isNew }) {
  const [open, setOpen] = useState(false)
  return <article className="card">
    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
      {isNew && <span className="tag bad nocap">{t('New')}</span>}
      <span className={'tag nocap ' + LEVEL_CLS[it.evidence.key]}>{it.evidence.label}</span>
      <span className="dim small">{it.short}{it.date ? ' · ' + fmtDate(it.date, true) : ''}</span>
    </div>
    <a href={it.url} target="_blank" rel="noopener noreferrer" lang="en" style={{ display: 'block', fontWeight: 600, marginTop: 8, color: 'inherit', textDecoration: 'none' }}>{it.title}</a>
    {it.authors && <div className="dim" style={{ fontSize: '.75rem', marginTop: 4 }}>{it.authors} · <i>{it.journal}</i></div>}
    {it.conclusion && <>
      <button className="linkbtn small" style={{ marginTop: 8 }} aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} /> {t("Authors' conclusion")}</button>
      {open && <p className="small reveal" lang="en" style={{ margin: '6px 0 0', padding: '8px 10px', borderRadius: 10, background: 'var(--acc-soft)' }}>{it.conclusion}</p>}
    </>}
    <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
      <a className="chip nocap" href={it.url} target="_blank" rel="noopener noreferrer"><Icon name="link" /> PubMed {it.pmid}</a>
      {it.doi && <a className="chip nocap" href={'https://doi.org/' + it.doi} target="_blank" rel="noopener noreferrer"><Icon name="globe" /> DOI</a>}
    </div>
  </article>
}

export default function ResearchFeed() {
  const [topic, setTopic] = useState(null)
  const [level, setLevel] = useState(null)
  const [d, setD] = useState(null)
  const [err, setErr] = useState(null)
  const [showJournals, setShowJournals] = useState(false)
  // what counted as seen when the screen opened; the mark moves on for next time
  const [seen] = useState(readSeen)

  useEffect(() => {
    setErr(null)
    api('/api/research' + (topic ? '?topic=' + topic : '')).then(r => {
      setD(r)
      const newest = r.items.reduce((m, i) => (i.date > m ? i.date : m), '')
      if (!topic && newest > readSeen()) writeSeen(newest)
    }).catch(e => setErr(e.message))
  }, [topic])

  const items = useMemo(() => (d?.items || []).filter(i => !level || i.evidence.key === level), [d, level])
  const fresh = seen ? items.filter(i => i.date > seen).length : 0

  return <div>
    <div className="dim small" style={{ margin: '0 0 10px' }}>
      {t('Only peer-reviewed papers indexed in PubMed, from the main sport-science and sports-medicine journals: guidelines, meta-analyses, systematic reviews and randomized trials from the last year. Titles and conclusions in the original language.')}
      {' '}<button className="linkbtn small" onClick={() => setShowJournals(v => !v)}>{showJournals ? t('Hide journals') : t('See journals')}</button>
    </div>
    {showJournals && d && <div className="card dim small" style={{ marginTop: 0 }}>{d.journals.join(' · ')}</div>}

    <div className="chips edge" style={{ marginBottom: 8 }} role="group" aria-label={t('Topic')}>
      <button type="button" className={'chip nocap' + (!topic ? ' on' : '')} aria-pressed={!topic} onClick={() => setTopic(null)}>{t('All')}</button>
      {(d?.topics || []).map(tp => <button key={tp.id} type="button" className={'chip nocap' + (topic === tp.id ? ' on' : '')} aria-pressed={topic === tp.id} onClick={() => setTopic(topic === tp.id ? null : tp.id)}>{tp.label}</button>)}
    </div>
    <div className="chips edge" style={{ marginBottom: 12 }} role="group" aria-label={t('Type of study')}>
      {LEVELS.map(l => <button key={l.label} type="button" className={'chip nocap' + (level === l.key ? ' on' : '')} aria-pressed={level === l.key} onClick={() => setLevel(l.key)}>{t(l.label)}</button>)}
    </div>

    {err && <div className="empty small">{err}</div>}
    {!d && !err && <div className="empty small">{t('Loading…')}</div>}
    {d && !d.updated && <div className="empty small">{t('The first papers are on their way: the list fills in a few minutes after the server starts.')}</div>}
    {d?.updated && <div className="dim" style={{ fontSize: '.72rem', marginBottom: 8 }}>
      {fresh > 0 ? (fresh === 1 ? t('1 new since your last visit') : t('{0} new since your last visit', fresh)) + ' · ' : ''}
      {t('{0} papers · updated {1}', items.length, fmtDate(d.updated.slice(0, 10), true))}</div>}
    {items.map(it => <Paper key={it.pmid} it={it} isNew={!!seen && it.date > seen} />)}
    {d?.updated && !items.length && <div className="empty small">{t('No papers of this type in this topic yet.')}</div>}
  </div>
}
