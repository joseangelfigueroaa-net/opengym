import { describe, it, expect } from 'vitest'
import { PROGRAMS, EX_NOTES, GOALS, LIMITS, FOCUS, METHODS, fitScore, layOut } from './programs.js'
import { EXDB } from './exercises-data.js'

const byId = Object.fromEntries(EXDB.map(e => [e.id, e]))

describe('training models', () => {
  it('only use exercises that exist and are explained', () => {
    for (const p of PROGRAMS) for (const s of p.sessions) for (const x of s.ex) {
      expect(byId[x.id], `${p.id}/${s.name}: ${x.id}`).toBeTruthy()
      expect(EX_NOTES[x.id], `${x.id} has no note`).toBeTruthy()
      expect(x.sets).toBeGreaterThanOrEqual(1)
    }
  })

  it('every exercise is congruent with its model’s method', () => {
    for (const p of PROGRAMS) {
      const m = METHODS[p.method]
      expect(m, `${p.id} has no method`).toBeTruthy()
      for (const s of p.sessions) for (const x of s.ex) {
        const where = `${p.id}/${s.name}/${x.id}`
        expect(m.modes, `${where}: ${x.mode} not in ${p.method}`).toContain(x.mode)
        // cardio exercises are logged as cardio, and only they are
        expect(byId[x.id].bp === 'cardio', `${where}: cardio exercise vs mode ${x.mode}`).toBe(x.mode === 'cardio')
        if (x.mode === 'reps') {
          expect(x.repsMin, where).toBeLessThanOrEqual(x.reps)
          expect(x.repsMin, `${where}: below ${p.method} window`).toBeGreaterThanOrEqual(m.reps[0])
          expect(x.reps, `${where}: above ${p.method} window`).toBeLessThanOrEqual(m.reps[1])
        }
        if (x.mode === 'time') expect(x.sec).toBeGreaterThanOrEqual(5)
        if (x.mode === 'cardio') expect(x.min).toBeGreaterThan(0)
      }
    }
  })

  it('every model states its rationale and cites research or a reference book', () => {
    for (const p of PROGRAMS) {
      expect(p.basis.length).toBeGreaterThan(80)
      expect(p.refs.length + p.books.length, p.id).toBeGreaterThan(0)
      for (const r of p.refs) expect(r.url).toMatch(/^https:\/\//)
      for (const b of p.books) expect(SOURCES, `${p.id} → ${b}`).toHaveProperty(b)
    }
  })

  it('method rest fills in where a model sets none, and an explicit rest wins', () => {
    const fm = PROGRAMS.find(x => x.id === 'fuerza-basica')
    const plan = layOut(fm, { start: '2026-10-19', weeks: 1, weekdays: [1] })
    expect(plan[0].ex.every(x => x.rest === METHODS.fuerza_maxima.rest)).toBe(true)
    const pw = PROGRAMS.find(x => x.id === 'potencia')
    const legs = layOut(pw, { start: '2026-10-19', weeks: 1, weekdays: [2] })[0]
    expect(legs.ex.find(x => x.id === '0043').rest).toBe(180)
    expect(legs.ex.find(x => x.id === '0514').rest).toBe(METHODS.potencia.rest)
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
