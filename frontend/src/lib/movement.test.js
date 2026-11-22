import { describe, it, expect } from 'vitest'
import { PATTERNS, readCheck, checkAge, improved, latestCheck } from './movement.js'
import { LIMITS, PROGRAMS, EX_NOTES, JOINT_WARMUP, fitScore } from './programs.js'
import { EXDB } from './exercises-data.js'

describe('movement check', () => {
  it('has seven patterns whose limitations exist', () => {
    expect(PATTERNS).toHaveLength(7)
    PATTERNS.forEach(p => { if (p.limit) expect(LIMITS).toHaveProperty(p.limit) })
  })

  it('pain switches on the limitation of its pattern, limited does not', () => {
    const r = readCheck({ r: { squat: 'pain', bend: 'limited', reach: 'ok', neck: 'pain' } })
    expect(r.pain.map(p => p.id).sort()).toEqual(['neck', 'squat'])
    expect(r.limited.map(p => p.id)).toEqual(['bend'])
    expect(r.limits).toEqual(['knee'])
    expect(r.done).toBe(4)
  })

  it('knows how old the last check is and what improved', () => {
    const profile = { screens: [{ d: '2026-11-22', r: { squat: 'ok', bend: 'limited', reach: 'pain' } }, { d: '2026-10-01', r: { squat: 'pain', bend: 'limited', reach: 'limited' } }] }
    expect(latestCheck(profile).d).toBe('2026-11-22')
    expect(checkAge(profile, '2026-12-04')).toBe(12)
    expect(checkAge({}, '2026-12-04')).toBe(null)
    expect(improved(profile).map(p => p.id)).toEqual(['squat'])
  })

  it('a limited pattern brings the mobility model up', () => {
    const mob = PROGRAMS.find(p => p.id === 'movilidad')
    const base = { goal: 'health', limits: [] }
    expect(fitScore(mob, { ...base, screens: [{ d: '2026-11-22', r: { bend: 'limited' } }] })).toBe(fitScore(mob, base) + 3)
  })

  it('the joint warm-up uses real exercises, each explained', () => {
    const ids = new Set(EXDB.map(x => x.id))
    JOINT_WARMUP.forEach(x => { expect(ids.has(x.id), x.id).toBe(true); expect(EX_NOTES[x.id], x.id).toBeTruthy() })
  })
})
