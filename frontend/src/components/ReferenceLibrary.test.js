import { describe, it, expect } from 'vitest'
import { buildLibrary } from './ReferenceLibrary.jsx'
import { PROGRAMS } from '../lib/programs.js'

describe('reference library', () => {
  const lib = buildLibrary()
  it('lists every reference a model cites, once, with the models that use it', () => {
    const urls = new Set(PROGRAMS.flatMap(p => p.refs.map(r => r.url)))
    for (const u of urls) expect(lib.filter(x => x.url === u)).toHaveLength(1)
    const acsm = lib.find(x => x.url.includes('PMC12965823'))
    expect(acsm.kind).toBe('guide')
    expect(acsm.by.length).toBeGreaterThan(5)
  })
  it('sorts papers into guidelines, reviews and studies, and keeps the books', () => {
    expect(lib.find(x => x.url?.includes('27433992')).kind).toBe('review')
    expect(lib.find(x => x.url?.includes('26605807')).kind).toBe('study')
    expect(lib.some(x => x.kind === 'book')).toBe(true)
    expect(lib.find(x => x.text.startsWith('McGill')).kind).toBe('book')
    expect(lib.find(x => x.text.startsWith('ACE')).kind).toBe('report')
    expect(lib.find(x => x.text.startsWith('Fragala')).kind).toBe('guide')
  })
})
