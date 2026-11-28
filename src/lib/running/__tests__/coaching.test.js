import { describe, it, expect } from 'vitest'
import { vdotFromRace, trainingPaces } from '../vdot.js'
import { assessGoal, tidyTime } from '../feasibility.js'
import { evaluateRun, decideVdotUpdate, assessMissed, impliedVdot } from '../adapt.js'
import { periodize } from '../phases.js'
import { buildTaper, taperFactors } from '../taper.js'
import { sessionLoad, weeklyLoads } from '../load.js'
import { formatClock, formatPace, parseClock, formatDistance } from '../format.js'

describe('Feasibility', () => {
  it('is honest about 24:00 to 20:00 in 12 weeks and offers a stepping stone', () => {
    const current = vdotFromRace(5000, 24 * 60)
    expect(current).toBeCloseTo(40.2, 0)
    const r = assessGoal({ currentVdot: current, goalDistanceM: 5000, goalTimeS: 1200, weeks: 12, level: 'intermediate' })
    expect(r.status).toBe('unrealistic')
    expect(r.goalVdot).toBeCloseTo(49.8, 1)
    expect(r.weeksNeeded).toBeGreaterThan(26) // many months, not a 12-week plan
    expect(r.steppingStone.timeS).toBeLessThan(24 * 60)
    expect(r.steppingStone.timeS).toBeGreaterThan(20 * 60)
    expect(r.steppingStone.timeS % 15).toBe(0)
    expect(r.predictedAtGoal.low).toBeLessThan(r.predictedAtGoal.high)
    expect(r.predictedAtGoal.low).toBeGreaterThan(1200) // never predicts the unreachable goal
  })

  it('calls a small gain realistic and an already-beaten goal achieved', () => {
    const current = vdotFromRace(5000, 22 * 60)
    expect(assessGoal({ currentVdot: current, goalDistanceM: 5000, goalTimeS: 21 * 60 + 45, weeks: 16 }).status).toBe('realistic')
    expect(assessGoal({ currentVdot: current, goalDistanceM: 5000, goalTimeS: 23 * 60, weeks: 8 }).status).toBe('achieved')
  })

  it('rounds stepping stones to tidy times', () => {
    expect(tidyTime(1381, 5000)).toBe(1395)
    expect(tidyTime(3001, 10000)).toBe(3030)
  })
})

describe('Phases and taper', () => {
  it('extends the base phase when there is plenty of time', () => {
    const p = periodize(20, 5000)
    expect(p.compressed).toBe(false)
    expect(p.phases.map((x) => x.name)).toEqual(['base', 'build', 'sharpen', 'taper'])
    expect(p.phases[0].weeks).toBe(11)
    expect(p.phases.reduce((s, x) => s + x.weeks, 0)).toBe(20)
  })

  it('compresses phases when time is short', () => {
    for (const w of [3, 6, 9, 12]) {
      const p = periodize(w, 21097.5)
      expect(p.compressed).toBe(true)
      expect(p.phases.reduce((s, x) => s + x.weeks, 0)).toBe(w)
      expect(p.phases.at(-1).name).toBe('taper')
      for (const x of p.phases) expect(x.weeks).toBeGreaterThan(0)
    }
  })

  it('uses a short taper for 5K and a 2-week taper for longer races', () => {
    expect(taperFactors(5000)).toHaveLength(1)
    expect(taperFactors(42195)).toHaveLength(2)
    const t = buildTaper(42195, 60000)
    expect(t[1].volumeM / 60000).toBeGreaterThanOrEqual(0.4)
    expect(t[1].volumeM / 60000).toBeLessThanOrEqual(0.6)
    expect(t.every((w) => w.keepQuality)).toBe(true)
  })
})

describe('Adaptation after a run', () => {
  const vdot = 45
  const paces = trainingPaces(vdot)
  const threshold = { type: 'threshold', work: { distanceM: 4000, pace: 'threshold' } }
  const run = (over) => ({ distanceM: 8000, durationS: 2700, rpe: 6, pain: 'none', ...over })
  const types = (r) => r.actions.map((a) => a.type)

  it('stops progression when pain changed how they ran', () => {
    const r = evaluateRun({ session: threshold, run: run({ pain: 'affected', workPaceSPerKm: paces.threshold.fast - 5 }), vdot, paces })
    expect(types(r)).toEqual(['stop-progression'])
    expect(r.signal).toBeNull()
    expect(r.actions[0].reason).toMatch(/medical/)
  })

  it('holds on mild pain and never upgrades', () => {
    const r = evaluateRun({ session: threshold, run: run({ pain: 'mild', workPaceSPerKm: paces.threshold.fast - 5 }), vdot, paces })
    expect(types(r)).toContain('hold-progression')
    expect(r.signal).toBeNull()
  })

  it('recomputes VDOT directly from a race or time trial', () => {
    const r = evaluateRun({ session: { type: 'time-trial' }, run: run({ distanceM: 5000, durationS: 1200, rpe: 9 }), vdot, paces })
    expect(r.actions[0].type).toBe('recompute-vdot')
    expect(r.actions[0].newVdot).toBeCloseTo(49.8, 1)
  })

  it('coaches fast easy runs instead of upgrading fitness', () => {
    const fast = paces.easy.fast * 0.9
    const r = evaluateRun({ session: { type: 'easy' }, run: run({ distanceM: 8000, durationS: 8 * fast, rpe: 4 }), vdot, paces })
    expect(types(r)).toEqual(['easy-too-fast'])
    expect(r.signal).toBeNull()
  })

  it('counts a quality session hit at target effort as a signal', () => {
    const r = evaluateRun({ session: threshold, run: run({ workPaceSPerKm: paces.threshold.fast - 3, rpe: 6 }), vdot, paces })
    expect(types(r)).toEqual(['vdot-signal'])
    expect(r.signal.impliedVdot).toBeGreaterThan(vdot)
  })

  it('does not count a fast session that felt too hard', () => {
    const r = evaluateRun({ session: threshold, run: run({ workPaceSPerKm: paces.threshold.fast - 3, rpe: 9 }), vdot, paces })
    expect(types(r)).toEqual(expect.arrayContaining(['much-harder', 'hold-progression']))
    expect(types(r)).not.toContain('swap-next-quality')
    expect(r.signal).toBeNull()
  })

  it('swaps the next quality day when hard sessions repeat', () => {
    const r = evaluateRun({ session: threshold, run: run({ rpe: 10 }), vdot, paces, recentHardFlags: 1 })
    expect(types(r)).toContain('swap-next-quality')
  })

  it('needs two consistent signals before raising VDOT, and caps the step', () => {
    const one = [{ date: '2026-11-01', impliedVdot: 47 }]
    expect(decideVdotUpdate(45, one, '2026-11-20')).toBeNull()
    const two = [...one, { date: '2026-11-15', impliedVdot: 46.2 }]
    expect(decideVdotUpdate(45, two, '2026-11-20').newVdot).toBeCloseTo(46.2, 6) // the lower reading
    const big = [{ date: '2026-11-01', impliedVdot: 52 }, { date: '2026-11-10', impliedVdot: 51 }]
    expect(decideVdotUpdate(45, big, '2026-11-20').newVdot).toBe(46.5)
    const stale = [{ date: '2026-08-01', impliedVdot: 47 }, { date: '2026-11-15', impliedVdot: 47 }]
    expect(decideVdotUpdate(45, stale, '2026-11-20')).toBeNull()
  })

  it('implies a higher VDOT from a faster pace', () => {
    expect(impliedVdot(240, 0.88)).toBeGreaterThan(impliedVdot(250, 0.88))
  })

  it('never crams missed sessions and steps back after weeks off', () => {
    expect(assessMissed(3).action).toBe('reflow')
    expect(assessMissed(3).volumeFactor).toBe(1)
    expect(assessMissed(10).action).toBe('reduce')
    expect(assessMissed(21).action).toBe('step-back-phase')
    expect(assessMissed(60).action).toBe('reassess')
  })
})

describe('Load and formatting', () => {
  it('computes session RPE load', () => {
    expect(sessionLoad(6, 45 * 60)).toBe(270)
    expect(sessionLoad(null, 600)).toBe(0)
    expect(sessionLoad(14, 600)).toBe(100) // clamps to the 10-point scale
  })

  it('groups weekly load from Monday', () => {
    const w = weeklyLoads([
      { date: '2026-11-23', rpe: 4, duration_s: 1800, distance_m: 5000 },
      { date: '2026-11-29', rpe: 6, duration_s: 1200, distance_m: 4000 },
      { date: '2026-11-30', rpe: 3, duration_s: 600, distance_m: 2000 },
    ])
    expect(w.get('2026-11-23')).toEqual({ load: 240, distanceM: 9000, runs: 2 })
    expect(w.get('2026-11-30').runs).toBe(1)
  })

  it('formats clocks, paces and distances', () => {
    expect(formatClock(1200)).toBe('20:00')
    expect(formatClock(3723)).toBe('1:02:03')
    expect(formatPace(255)).toBe('4:15 /km')
    expect(formatPace(255, 'mi')).toBe('6:50 /mi')
    expect(formatDistance(5000)).toBe('5.0 km')
    expect(formatDistance(12345)).toBe('12.3 km')
    expect(parseClock('20:00')).toBe(1200)
    expect(parseClock('1:35:10')).toBe(5710)
    expect(parseClock('abc')).toBeNull()
  })
})
