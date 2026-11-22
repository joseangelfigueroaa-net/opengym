import { useMemo, useState } from 'react'
import { t } from '../lib/i18n.js'
import { REFS, PROGRAMS } from '../lib/programs.js'
import { SOURCES, CONCEPTS } from '../lib/knowledge.js'
import { TextField } from './ui.jsx'

// The documentation behind Trainnery: every paper, guideline and position stand the training
// models and the knowledge cards cite, in one searchable list, each with the models and cards
// that use it. Built from the same objects the models use, so it cannot drift from them.

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
// First match wins: books, professional reports, then guidelines, reviews and, last, studies.
const KINDS = [
  ['guide', 'Guidelines and position stands', /ACSM \(|\/ ACSM|OMS|WHO|NICE|NSCA|consensus|guideline|position|best practice/i],
  ['review', 'Meta-analyses and reviews', /meta-analys|systematic review|review|overview|re-examination|revisi|dose-response relationship/i],
  ['study', 'Trials and studies', /./],
  ['report', 'Professional reports and articles', /ACE \(|Les Mills|trends/i],
  ['book', 'Books', /Human Kinetics|\d\.ª ed/]
]
const MATCH_ORDER = ['book', 'report', 'guide', 'review', 'study']

export function buildLibrary() {
  const byUrl = new Map()
  const add = (url, text, by) => {
    const had = byUrl.get(url)
    if (had) { if (!had.by.includes(by)) had.by.push(by) } else byUrl.set(url, { url, text, by: [by] })
  }
  for (const p of PROGRAMS) for (const r of p.refs) add(r.url, r.text, p.name)
  for (const c of CONCEPTS) for (const s of c.sources) {
    const src = SOURCES[s]
    if (src.url) add(src.url, `${src.author}. ${src.title}.`, c.title)
  }
  const kindOf = text => MATCH_ORDER.find(k => KINDS.find(x => x[0] === k)[2].test(text))
  const items = [...byUrl.values()].map(x => ({ ...x, kind: kindOf(x.text) }))
  for (const [k, src] of Object.entries(SOURCES)) if (!src.url) items.push({ url: null, text: `${src.title} — ${src.author}`, by: CONCEPTS.filter(c => c.sources.includes(k)).map(c => c.title), kind: 'book' })
  return items
}

export default function ReferenceLibrary() {
  const [q, setQ] = useState('')
  const all = useMemo(buildLibrary, [])
  const s = norm(q.trim())
  const shown = all.filter(x => !s || norm(x.text + ' ' + x.by.join(' ')).includes(s))

  return <div>
    <div className="dim small" style={{ margin: '0 0 10px' }}>
      {t('Every source the training models and knowledge cards rest on: {0} references. Each one links to its original.', all.length)}</div>
    <TextField type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search an author, topic or model')} aria-label={t('Search the library')} />
    {KINDS.map(([k, label]) => {
      const list = shown.filter(x => x.kind === k)
      if (!list.length) return null
      return <div key={k}>
        <h4 className="sec">{t(label)} · {list.length}</h4>
        <div className="card">
          {list.map((x, i) => <div key={x.url || x.text} style={{ padding: '8px 0', borderTop: i ? '1px solid var(--sep)' : 0 }}>
            <div className="small">{x.url ? <a href={x.url} target="_blank" rel="noopener noreferrer">{x.text}</a> : <i>{x.text}</i>}</div>
            {x.by.length > 0 && <div className="dim" style={{ fontSize: '.72rem', marginTop: 2 }}>{t('Used in')}: {x.by.join(' · ')}</div>}
          </div>)}
        </div>
      </div>
    })}
    {!shown.length && <div className="empty small">{t('Nothing matches “{0}”.', q)}</div>}
  </div>
}
