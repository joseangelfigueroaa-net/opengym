import { describe, it, expect } from 'vitest'
import { weeklySets, volumeBand } from './volume.js'
import { PROGRAMS } from './programs.js'

const lib = { a: { tg: 'pectorals', mg: 'triceps' }, b: { tg: 'quads', mg: 'glutes' }, c: { tg: 'cardiovascular system' } }
const look = id => lib[id]

describe('weekly volume', () => {
  it('counts the main muscle in full and the second as half, scaled by how often each session comes round', () => {
    const sessions = [{ ex: [{ id: 'a', sets: 3 }, { id: 'c', mode: 'cardio', sets: 4, min: 5 }] }, { ex: [{ id: 'b', sets: 4 }] }]
    // 4 days over 2 sessions: each happens twice a week
    expect(weeklySets(sessions, 4, look)).toEqual([['Pecho', 6], ['Tríceps', 3], ['Cuádriceps', 8], ['Glúteos', 4]])
    expect(weeklySets([], 3, look)).toEqual([])
  })

  it('bands follow the dose-response ranges', () => {
    expect(volumeBand(3).key).toBe('low')
    expect(volumeBand(7).key).toBe('mid')
    expect(volumeBand(10).key).toBe('good')
    expect(volumeBand(20).key).toBe('good')
    expect(volumeBand(24).key).toBe('high')
  })

  it('the upper/lower hypertrophy model gives its big muscles 10 sets a week or more, as its rationale says', () => {
    const v = Object.fromEntries(weeklySets(PROGRAMS.find(p => p.id === 'torso-pierna').sessions, 4))
    for (const g of ['Pecho', 'Espalda', 'Cuádriceps', 'Glúteos']) expect(v[g], g).toBeGreaterThanOrEqual(10)
  })
})
