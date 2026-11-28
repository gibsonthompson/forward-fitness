import { describe, it, expect } from 'vitest'
import { planCalendar, planDayForWeekday, weekdayIndex, addDays, daysBetween, planToRows, planAdjustments, rebuildStartVolume, daysSinceLastRun, racePace, repaceSessions } from '../replan.js'
import { buildPlan } from '../builder.js'
import { trainingPaces, raceTimeFromVdot } from '../vdot.js'

describe('calendar', () => {
  it('anchors the race to the last day of the last plan week', () => {
    const c = planCalendar('2027-03-14', '2026-11-28')
    expect(addDays(c.start, 7 * c.weeks - 1)).toBe('2027-03-14')
    expect(c.start <= '2026-11-28').toBe(true)
    expect(daysBetween(c.start, '2026-11-28')).toBeLessThan(7)
  })

  it('handles a race inside the first week', () => {
    const c = planCalendar('2026-11-30', '2026-11-28')
    expect(c.weeks).toBe(1)
    expect(addDays(c.start, 6)).toBe('2026-11-30')
  })

  it('maps a preferred weekday into the plan week', () => {
    // 2026-11-28 is a Saturday (index 5).
    expect(weekdayIndex('2026-11-28')).toBe(5)
    const start = '2026-11-24' // Tuesday
    expect(planDayForWeekday(6, start)).toBe(5) // Sunday is day 5 of a Tuesday-start week
    expect(planDayForWeekday(1, start)).toBe(0)
  })
})

describe('plan rows', () => {
  const vdot = 45
  const plan = buildPlan({ vdot, goalDistanceM: 10000, weeks: 8, level: 'intermediate', startWeeklyM: 25000, days: 4 })
  const start = '2026-11-23'
  const rows = planToRows(plan, { start, fromDate: '2026-11-26', vdot, goalDistanceM: 10000 })

  it('drops sessions before today and dates the rest', () => {
    expect(rows.every((r) => r.date >= '2026-11-26')).toBe(true)
    expect(rows.at(-1).type).toBe('race')
    expect(rows.at(-1).date).toBe(addDays(start, 8 * 7 - 1))
  })

  it('gives every run a target pace and keeps the work structure', () => {
    for (const r of rows) {
      if (r.type === 'strength') expect(r.target_pace).toBeNull()
      else expect(r.target_pace.fast).toBeLessThan(r.target_pace.slow)
    }
    const q = rows.find((r) => r.type === 'threshold')
    expect(q.structure.work.pace).toBe('threshold')
    expect(q.structure.reps).toBeGreaterThan(0)
  })

  it('uses race pace at current fitness for race-pace work', () => {
    const p = racePace(vdot, 10000)
    const mid = raceTimeFromVdot(vdot, 10000) / 10
    expect(p.fast).toBeLessThan(mid)
    expect(p.slow).toBeGreaterThan(mid)
  })

  it('re-targets planned runs after a fitness change', () => {
    const sessions = rows.map((r, i) => ({ ...r, id: String(i) }))
    const up = repaceSessions(sessions, trainingPaces(48), 48, 10000)
    expect(up.length).toBe(sessions.filter((s) => s.type !== 'strength').length)
    const easy = up.find((u) => sessions.find((s) => s.id === u.id).type === 'easy')
    expect(easy.patch.target_pace.fast).toBeLessThan(sessions.find((s) => s.id === easy.id).target_pace.fast)
  })
})

describe('planAdjustments', () => {
  const runDate = '2026-11-28'
  const upcoming = [
    { id: 'a', date: '2026-11-29', type: 'easy', distance_m: 6000 },
    { id: 'b', date: '2026-11-30', type: 'threshold', distance_m: 8000, structure: { week: 3 } },
    { id: 'c', date: '2026-12-02', type: 'easy', distance_m: 6000 },
    { id: 'd', date: '2026-12-04', type: 'interval', distance_m: 8000 },
    { id: 'e', date: '2026-12-06', type: 'long', distance_m: 12000 },
    { id: 'f', date: '2026-12-09', type: 'threshold', distance_m: 9000 },
  ]
  const ids = (xs) => xs.map((x) => x.id)

  it('swaps only the next quality session', () => {
    const out = planAdjustments([{ type: 'swap-next-quality' }], upcoming, { runDate, weekVolumeM: 0 })
    expect(ids(out)).toEqual(['b'])
    expect(out[0].patch.type).toBe('easy')
    expect(out[0].patch.structure.swappedFrom).toBe('threshold')
  })

  it('rests 3 days and removes quality for 10 days when pain changed their running', () => {
    const out = planAdjustments([{ type: 'stop-progression' }], upcoming, { runDate, weekVolumeM: 0 })
    const byId = Object.fromEntries(out.map((o) => [o.id, o.patch]))
    expect(byId.a.status).toBe('skipped')
    expect(byId.b.status).toBe('skipped')
    expect(byId.d.type).toBe('easy')
    expect(byId.f).toBeUndefined() // beyond 10 days
  })

  it('holds next week at this week\'s volume', () => {
    const out = planAdjustments([{ type: 'hold-progression' }], upcoming, { runDate, weekVolumeM: 19000 })
    const total = out.reduce((t, o) => t + o.patch.distance_m, 0)
    expect(total).toBeLessThanOrEqual(19000 + 300)
    expect(out.length).toBe(4) // the long run on day 8 is outside the coming week
  })

  it('does nothing for a normal run', () => {
    expect(planAdjustments([{ type: 'none' }], upcoming, { runDate, weekVolumeM: 20000 })).toEqual([])
  })
})

describe('rebuild helpers', () => {
  const runs = [
    { date: '2026-11-20', distance_m: 8000 },
    { date: '2026-11-25', distance_m: 6000 },
    { date: '2026-11-27', distance_m: 5000 },
  ]
  it('starts from recent real volume, scaled after time away', () => {
    expect(rebuildStartVolume(runs, '2026-11-28')).toBe(11000)
    expect(rebuildStartVolume(runs, '2026-11-28', 0.7)).toBe(7700)
    expect(rebuildStartVolume([], '2026-11-28', 1, 15000)).toBe(15000)
  })
  it('counts days since the last run', () => {
    expect(daysSinceLastRun(runs, '2026-11-28')).toBe(1)
    expect(daysSinceLastRun([], '2026-11-28')).toBeNull()
  })
})
