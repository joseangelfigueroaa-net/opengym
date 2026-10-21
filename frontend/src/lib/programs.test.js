import { describe, it, expect } from 'vitest'
import { PROGRAMS, EX_NOTES, GOALS, LIMITS, FOCUS, fitScore, layOut } from './programs.js'
import { EXDB } from './exercises-data.js'

const byId = Object.fromEntries(EXDB.map(e => [e.id, e]))

describe('training models', () => {
  it('only use exercises that exist, are logged by reps, and are explained', () => {
    for (const p of PROGRAMS) for (const s of p.sessions) for (const x of s.ex) {
      expect(byId[x.id], `${p.id}/${s.name}: ${x.id}`).toBeTruthy()
      expect(byId[x.id].bp, `${x.id} is cardio`).not.toBe('cardio')
      expect(EX_NOTES[x.id], `${x.id} has no note`).toBeTruthy()
      expect(x.repsMin).toBeLessThanOrEqual(x.reps)
      expect(x.sets).toBeGreaterThanOrEqual(1)
    }
  })

  it('every model states its rationale with at least one reference', () => {
    for (const p of PROGRAMS) {
      expect(p.basis.length).toBeGreaterThan(80)
      expect(p.refs.length).toBeGreaterThan(0)
      for (const r of p.refs) expect(r.url).toMatch(/^https:\/\//)
    }
  })

  it('only use the vocabulary the server accepts', () => {
    for (const p of PROGRAMS) {
      p.goals.forEach(g => expect(GOALS).toHaveProperty(g))
      ;[...p.suits, ...p.avoid].forEach(l => expect(LIMITS).toHaveProperty(l))
      expect(FOCUS).toHaveProperty(p.focus)
    }
  })

  it('a model that avoids one of the client limitations is not offered', () => {
    const strength = PROGRAMS.find(p => p.id === 'fuerza-basica')
    expect(fitScore(strength, { goal: 'strength', limits: ['lower_back'] })).toBeNull()
    const back = PROGRAMS.find(p => p.id === 'espalda-cuidada')
    expect(fitScore(back, { goal: 'strength', limits: ['lower_back'] })).toBeGreaterThan(0)
  })

  it('lays sessions A, B, A… over the chosen weekdays', () => {
    const p = PROGRAMS.find(x => x.id === 'fundamentos')
    // 2026-10-19 is a Monday; Mon/Wed/Fri for two weeks = 6 sessions
    const plan = layOut(p, { start: '2026-10-19', weeks: 2, weekdays: [1, 3, 5] })
    expect(plan.map(d => d.date)).toEqual(['2026-10-19', '2026-10-21', '2026-10-23', '2026-10-26', '2026-10-28', '2026-10-30'])
    expect(plan.map(d => d.name.slice(-1))).toEqual(['A', 'B', 'A', 'B', 'A', 'B'])
  })
})

import { CONCEPTS, SOURCES, conceptById, CATEGORIES } from './knowledge.js'

describe('knowledge area', () => {
  it('every concept cites existing sources and belongs to a category', () => {
    for (const c of CONCEPTS) {
      expect(CATEGORIES, c.id).toHaveProperty(c.cat)
      expect(c.sources.length, c.id).toBeGreaterThan(0)
      c.sources.forEach(s => expect(SOURCES, `${c.id} → ${s}`).toHaveProperty(s))
      expect(c.summary.length).toBeGreaterThan(60)
    }
  })
  it('concept ids are unique and every model links to real concepts', () => {
    expect(new Set(CONCEPTS.map(c => c.id)).size).toBe(CONCEPTS.length)
    for (const p of PROGRAMS) {
      expect(p.concepts.length, p.id).toBeGreaterThan(0)
      p.concepts.forEach(id => expect(conceptById[id], `${p.id} → ${id}`).toBeTruthy())
    }
  })
})
