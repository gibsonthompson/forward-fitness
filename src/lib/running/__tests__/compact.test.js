import { describe, it, expect } from 'vitest'
import { buildPlan } from '../builder.js'
import { toCompact, expandCompact, checkPlanShape } from '../compact.js'
import { validatePlan } from '../guardrails.js'

function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296) }
const pick = (r, xs) => xs[Math.floor(r() * xs.length)]

describe('compact plan format', () => {
  it('round-trips every builder plan without breaking a guardrail', () => {
    const r = rng(7)
    const failures = []
    for (let n = 0; n < 400; n++) {
      const p = {
        vdot: 25 + r() * 40,
        goalDistanceM: pick(r, [5000, 10000, 21097.5, 42195]),
        weeks: 2 + Math.floor(r() * 26),
        level: pick(r, ['beginner', 'intermediate', 'experienced']),
        startWeeklyM: pick(r, [0, 8000, 20000, 40000, 70000]),
        days: 2 + Math.floor(r() * 6),
        longRunDay: pick(r, [6, 5, 0]),
      }
      const plan = buildPlan(p)
      const { weeks, problems } = expandCompact(toCompact(plan), { goalDistanceM: p.goalDistanceM, level: p.level })
      const again = { weeks, paces: plan.paces }
      const v = validatePlan(again, { level: p.level, paces: plan.paces, startWeeklyM: p.startWeeklyM, goalDistanceM: p.goalDistanceM, availableDays: p.days })
      const shape = checkPlanShape(again, { weeks: p.weeks, goalDistanceM: p.goalDistanceM })
      if (problems.length || !v.ok || shape.length) failures.push({ p, problems, errors: v.errors.slice(0, 2), shape })
    }
    expect(failures.slice(0, 3)).toEqual([])
  })

  it('builds reps, warmups and tests in code', () => {
    const [w] = expandCompact([{ phase: 'build', recovery: false, sessions: [
      { day: 1, type: 'interval', km: 8, work_km: 3.2, rep_m: 800 },
      { day: 3, type: 'time-trial', km: 6, work_km: 3, rep_m: null },
      { day: 5, type: 'easy', km: 6, work_km: null, rep_m: null },
    ] }], { goalDistanceM: 10000, level: 'intermediate' }).weeks
    const iv = w.sessions[0]
    expect(iv.structure).toMatchObject({ reps: 4, repM: 800, warmupM: 2400, cooldownM: 2400 })
    expect(iv.work).toEqual({ distanceM: 3200, pace: 'interval' })
    expect(w.sessions[1].structure.testM).toBe(3000)
  })

  it('reports sessions it cannot expand', () => {
    const { problems } = expandCompact([{ phase: 'build', recovery: false, sessions: [
      { day: 1, type: 'interval', km: 2, work_km: 3, rep_m: 1000 },
      { day: 3, type: 'sprint', km: 5, work_km: null, rep_m: null },
    ] }], { goalDistanceM: 5000, level: 'intermediate' })
    expect(problems.length).toBe(2)
  })

  it('checks the overall shape', () => {
    const plan = buildPlan({ vdot: 45, goalDistanceM: 10000, weeks: 8, level: 'intermediate', startWeeklyM: 25000, days: 4 })
    expect(checkPlanShape(plan, { weeks: 8 })).toEqual([])
    expect(checkPlanShape(plan, { weeks: 9 }).length).toBe(1)
    const noRace = { weeks: plan.weeks.map((w) => ({ ...w, sessions: w.sessions.filter((s) => s.type !== 'race') })) }
    expect(checkPlanShape(noRace, { weeks: 8 })[0]).toMatch(/exactly one race/)
  })
})
