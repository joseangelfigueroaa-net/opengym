import { describe, it, expect, beforeAll } from 'vitest'
import { setLang } from './i18n.js'
import { EXDB, exOr, exMatches } from './exercises.js'
import es from '../names/es.js'

describe('exercise names in Spanish', () => {
  beforeAll(() => setLang('es'))
  it('every exercise has its own Spanish name', () => {
    for (const e of EXDB) expect(es[e.id], e.id).toBeTruthy()
    expect(new Set(Object.values(es)).size).toBe(Object.keys(es).length)
  })
  it('screens get the Spanish name and the library reads alphabetically', () => {
    expect(exOr('1760').n).toBe('Sentadilla goblet con mancuerna')
    const names = EXDB.map(e => e.n)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')))
  })
  it('search ignores accents and still finds the English name', () => {
    const goblet = exOr('1760')
    expect(exMatches(goblet, 'mancuerna')).toBe(true)
    expect(exMatches(exOr('0579'), 'jalon frontal')).toBe(true)
    expect(exMatches(goblet, 'goblet squat')).toBe(true)
    expect(exMatches(goblet, 'press de banca')).toBe(false)
  })
  it('switching back to English restores the dataset names', async () => {
    await setLang('en')
    expect(exOr('1760').n).toBe('dumbbell goblet squat')
    await setLang('es')
  })
})
