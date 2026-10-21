import { describe, it, expect } from 'vitest'
import { applyAssignments } from './trainer.js'

const A = (id, date, name = 'Pierna') => ({ id, date, name, note: '', sentAt: '2026-10-20T10:00:00Z', ex: [{ id: '0043', sets: 3, repsMin: 6, reps: 8 }] })
const fresh = () => ({ routines: [{ id: 'mine', name: 'Mi rutina', ex: [] }], dayPlan: { '2026-10-30': 'mine' } })

describe('assigned workouts in the client state', () => {
  it('become double-progression routines pinned to their day', () => {
    const S = fresh()
    applyAssignments(S, [A('a1', '2026-10-21')], '2026-10-21')
    const r = S.routines.find(x => x.id === 'tr-a1')
    expect(r.prog).toBe('double')
    expect(r.ex[0]).toMatchObject({ id: '0043', sets: 3, repsMin: 6, reps: 8, mode: 'reps' })
    expect(S.dayPlan['2026-10-21']).toBe('tr-a1')
    expect(S.dayPlan['2026-10-30']).toBe('mine')   // the client's own plan is untouched
  })

  it('a withdrawn or replaced assignment leaves no routine behind', () => {
    const S = fresh()
    applyAssignments(S, [A('a1', '2026-10-22'), A('a2', '2026-10-24')], '2026-10-21')
    applyAssignments(S, [A('a3', '2026-10-22', 'Torso')], '2026-10-21')   // a1 replaced, a2 withdrawn
    expect(S.routines.map(r => r.id).sort()).toEqual(['mine', 'tr-a3'])
    expect(S.dayPlan).toEqual({ '2026-10-30': 'mine', '2026-10-22': 'tr-a3' })
  })

  it('a past session stays for two weeks, then goes', () => {
    const S = fresh()
    applyAssignments(S, [A('a1', '2026-10-21')], '2026-10-21')
    applyAssignments(S, [], '2026-10-25')          // no longer served, but recent: kept
    expect(S.routines.some(r => r.id === 'tr-a1')).toBe(true)
    applyAssignments(S, [], '2026-11-10')          // older than two weeks: dropped
    expect(S.routines.some(r => r.id === 'tr-a1')).toBe(false)
    expect(S.dayPlan['2026-10-21']).toBeUndefined()
  })

  it('running it twice changes nothing', () => {
    const S = fresh()
    applyAssignments(S, [A('a1', '2026-10-22')], '2026-10-21')
    const once = JSON.stringify(S)
    applyAssignments(S, [A('a1', '2026-10-22')], '2026-10-21')
    expect(JSON.stringify(S)).toBe(once)
  })
})
