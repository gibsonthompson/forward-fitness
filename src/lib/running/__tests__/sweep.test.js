// Seeded sweep: hundreds of random setups through the builder, every plan must pass the guardrails.
import { describe, it, expect } from 'vitest'
import { buildPlan } from '../builder.js'
import { validatePlan } from '../guardrails.js'

function rng(seed) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
}
const pick = (r, xs) => xs[Math.floor(r() * xs.length)]

describe('builder sweep', () => {
  it('every generated plan passes every guardrail', () => {
    const r = rng(42)
    const failures = []
    for (let n = 0; n < 3000; n++) {
      const p = {
        vdot: 25 + r() * 40,
        goalDistanceM: pick(r, [5000, 10000, 21097.5, 42195]),
        weeks: 2 + Math.floor(r() * 30),
        level: pick(r, ['beginner', 'intermediate', 'experienced']),
        startWeeklyM: pick(r, [0, 5000, 12000, 20000, 35000, 60000, 90000]),
        days: 2 + Math.floor(r() * 6),
        longRunDay: pick(r, [6, 6, 5, 0, 3]),
        bmi: pick(r, [undefined, 24, 32]),
      }
      const plan = buildPlan(p)
      const res = validatePlan(plan, { level: p.level, paces: plan.paces, startWeeklyM: p.startWeeklyM, goalDistanceM: p.goalDistanceM, availableDays: p.days, bmi: p.bmi })
      if (!res.ok) failures.push({ p, errors: res.errors.slice(0, 3).map((e) => e.message) })
    }
    expect(failures.slice(0, 5)).toEqual([])
  })
})
