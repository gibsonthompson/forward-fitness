// Supabase reads and writes for the running coach. All decisions come from src/lib/running;
// this file only loads state and persists what the engine decided.
import { supabase } from '../supabaseClient'
import {
  buildPlan, trainingPaces, evaluateRun, impliedVdot, decideVdotUpdate, assessMissed, vdotFromRace,
  builderOptions, planningLevel, planToRows, planAdjustments, repaceSessions, rebuildStartVolume,
  addDays, daysBetween, RUN_TYPES,
} from '../lib/running'

export { planningLevel }

export function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function check(res) {
  if (res.error) throw res.error
  return res.data
}

/** Everything the Run tab needs. Returns { goal, plan, sessions, runs, estimates, changes }. */
export async function loadRunning() {
  const goal = check(await supabase.from('iron_run_goals').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1))[0] || null
  const runs = check(await supabase.from('iron_runs').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(400))
  const estimates = check(await supabase.from('iron_fitness_estimates').select('*').order('date', { ascending: true }).order('created_at', { ascending: true }).limit(200))
  if (!goal) return { goal: null, plan: null, sessions: [], runs, estimates, changes: [] }
  const plan = check(await supabase.from('iron_run_plans').select('*').eq('goal_id', goal.id).eq('active', true).limit(1))[0] || null
  if (!plan) return { goal, plan: null, sessions: [], runs, estimates, changes: [] }
  const [sessions, changes] = await Promise.all([
    supabase.from('iron_run_plan_sessions').select('*').eq('plan_id', plan.id).order('date', { ascending: true }),
    supabase.from('iron_plan_changes').select('*').eq('plan_id', plan.id).order('created_at', { ascending: false }).limit(40),
  ])
  return { goal, plan, sessions: check(sessions), runs, estimates, changes: check(changes) }
}

function buildFor(goal, { vdot, startWeeklyM, today }) {
  const { cal, opts } = builderOptions(goal, { vdot, startWeeklyM, today })
  return { cal, plan: buildPlan(opts) }
}

function phasesJson(plan, cal) {
  return { start: cal.start, weeks: plan.weeks.map((w, i) => ({ week: i + 1, phase: w.phase, recovery: !!w.recovery, volumeM: w.volumeM })) }
}

async function insertSessions(planId, rows) {
  if (!rows.length) return
  check(await supabase.from('iron_run_plan_sessions').insert(rows.map((r) => Object.assign({ plan_id: planId }, r))))
}

async function logChange(planId, kind, reason, extra = {}) {
  await supabase.from('iron_plan_changes').insert({ plan_id: planId, kind, reason, run_id: extra.runId || null, details: extra.details || {} })
}

/**
 * Create a goal and its first plan.
 * input = { distanceM, targetTimeS, goalDate, vdot, vdotSource, assessment, setup }
 */
export async function createGoalAndPlan(input) {
  const today = todayStr()
  // Retire any previous goal and plan.
  const prev = check(await supabase.from('iron_run_goals').select('id').eq('status', 'active'))
  for (const g of prev) {
    check(await supabase.from('iron_run_plans').update({ active: false }).eq('goal_id', g.id))
    check(await supabase.from('iron_run_goals').update({ status: 'replaced' }).eq('id', g.id))
  }
  const goal = check(await supabase.from('iron_run_goals').insert({
    distance_m: input.distanceM, target_time_s: input.targetTimeS, goal_date: input.goalDate, setup: input.setup,
  }).select().single())
  try {
    const { cal, plan } = buildFor(goal, { vdot: input.vdot, startWeeklyM: input.setup.weeklyM || 0, today })
    const planRow = check(await supabase.from('iron_run_plans').insert({
      goal_id: goal.id, phases: phasesJson(plan, cal), current_vdot: input.vdot, paces: plan.paces,
    }).select().single())
    await insertSessions(planRow.id, planToRows(plan, { start: cal.start, fromDate: today, vdot: input.vdot, goalDistanceM: Number(goal.distance_m) }))
    check(await supabase.from('iron_fitness_estimates').insert({ vdot: input.vdot, source: input.vdotSource, date: today }))
    await logChange(planRow.id, 'created', 'Your plan was built from your goal, your current fitness and the days you can run.')
    return goal
  } catch (e) {
    await supabase.from('iron_run_goals').delete().eq('id', goal.id) // cascades to the plan and sessions
    throw e
  }
}

/** Rebuild every planned session from `fromDate` with new fitness or volume. */
export async function rebuildRemaining(state, { vdot, startWeeklyM, kind, reason, runId }) {
  const { goal, plan } = state
  const today = todayStr()
  const doneToday = state.sessions.some((s) => s.date === today && s.status === 'done')
  const fromDate = doneToday ? addDays(today, 1) : today
  const built = buildFor(goal, { vdot, startWeeklyM, today })
  const rows = planToRows(built.plan, { start: built.cal.start, fromDate, vdot, goalDistanceM: Number(goal.distance_m) })
  check(await supabase.from('iron_run_plan_sessions').delete().eq('plan_id', plan.id).eq('status', 'planned').gte('date', fromDate))
  await insertSessions(plan.id, rows)
  check(await supabase.from('iron_run_plans').update({ current_vdot: vdot, paces: built.plan.paces, phases: phasesJson(built.plan, built.cal), version: (plan.version || 1) + 1 }).eq('id', plan.id))
  await logChange(plan.id, kind, reason, { runId })
}

/** Rebuild after time away, using the engine's missed-training rules. */
export async function adjustAfterGap(state, daysAway) {
  const m = assessMissed(daysAway)
  const plannedWeek = state.sessions.filter((s) => s.date >= addDays(todayStr(), -7) && s.date < todayStr() && RUN_TYPES.has(s.type)).reduce((t, s) => t + Number(s.distance_m || 0), 0)
  const start = rebuildStartVolume(state.runs, todayStr(), m.volumeFactor, plannedWeek * m.volumeFactor)
  await rebuildRemaining(state, { vdot: Number(state.plan.current_vdot), startWeeklyM: start, kind: 'missed-' + m.action, reason: m.reason })
  return m
}

/**
 * Log a run and apply everything the engine decides.
 * run = { date, distanceM, durationS, rpe, pain, notes, workPaceSPerKm?, isRace? }
 * Returns { actions, adjustments } so the UI can show what changed and why.
 */
export async function logRun(state, run, sessionId) {
  const { plan, goal } = state
  const session = sessionId ? state.sessions.find((s) => s.id === sessionId) : null
  const inserted = check(await supabase.from('iron_runs').insert({
    date: run.date, distance_m: run.distanceM, duration_s: run.durationS, rpe: run.rpe, pain: run.pain,
    notes: run.notes || null, work_pace_s_per_km: run.workPaceSPerKm || null, plan_session_id: session ? session.id : null,
  }).select().single())
  if (session) check(await supabase.from('iron_run_plan_sessions').update({ status: 'done' }).eq('id', session.id))
  if (!plan) return { actions: [], adjustments: [], run: inserted }

  const vdot = Number(plan.current_vdot)
  const paces = plan.paces && plan.paces.easy ? plan.paces : trainingPaces(vdot)
  const since = addDays(run.date, -14)
  const recentHardFlags = state.changes.filter((c) => c.kind === 'much-harder' && c.created_at.slice(0, 10) >= since).length
  const sessionForEngine = session ? { type: session.type, work: session.structure?.work } : null
  const { actions, signal } = evaluateRun({
    session: sessionForEngine,
    run: { distanceM: run.distanceM, durationS: run.durationS, rpe: run.rpe, pain: run.pain, workPaceSPerKm: run.workPaceSPerKm, isRace: run.isRace },
    vdot, paces, recentHardFlags,
  })

  // Log every action except a fitness signal that ends up raising paces below; that one is
  // replaced by the paces-up message so the user never sees "one more session" after an upgrade.
  const logged = []
  async function logActions(skipSignal) {
    for (const a of actions) {
      if (a.type === 'none' || (skipSignal && a.type === 'vdot-signal')) continue
      await logChange(plan.id, a.type, a.reason, { runId: inserted.id })
      logged.push(a)
    }
  }

  // A race or time trial resets fitness directly and re-plans the remaining weeks.
  const recompute = actions.find((a) => a.type === 'recompute-vdot')
  if (recompute) {
    await logActions(false)
    check(await supabase.from('iron_fitness_estimates').insert({ vdot: recompute.newVdot, source: run.isRace || session?.type === 'race' ? 'race' : 'time-trial', run_id: inserted.id, date: run.date }))
    const runsNow = [inserted].concat(state.runs)
    const plannedWeek = state.sessions.filter((s) => s.date > addDays(run.date, -7) && s.date <= run.date && RUN_TYPES.has(s.type) && s.type !== 'race').reduce((t, s) => t + Number(s.distance_m || 0), 0)
    const start = rebuildStartVolume(runsNow.filter((r) => r.id !== inserted.id), run.date, 1, plannedWeek)
    if (goal && daysBetween(todayStr(), goal.goal_date) >= 0) {
      await rebuildRemaining(state, { vdot: recompute.newVdot, startWeeklyM: start, kind: 'replan', reason: 'Your remaining weeks were rebuilt around your new fitness.', runId: inserted.id })
    }
    return { actions: logged, adjustments: [], run: inserted, newVdot: recompute.newVdot }
  }

  // A strong quality session is a fitness signal. Two consistent signals raise paces.
  let newVdot = null
  if (signal) {
    check(await supabase.from('iron_runs').update({ implied_vdot: signal.impliedVdot }).eq('id', inserted.id))
    const signals = state.runs.filter((r) => r.implied_vdot != null).map((r) => ({ date: r.date, impliedVdot: Number(r.implied_vdot) }))
    signals.push({ date: run.date, impliedVdot: signal.impliedVdot })
    const up = decideVdotUpdate(vdot, signals, todayStr())
    if (up) {
      newVdot = up.newVdot
      const nextPaces = trainingPaces(up.newVdot)
      check(await supabase.from('iron_run_plans').update({ current_vdot: up.newVdot, paces: nextPaces, version: (plan.version || 1) + 1 }).eq('id', plan.id))
      check(await supabase.from('iron_fitness_estimates').insert({ vdot: up.newVdot, source: 'inferred', run_id: inserted.id, date: run.date }))
      const future = state.sessions.filter((s) => s.date > run.date && s.id !== sessionId)
      for (const u of repaceSessions(future, nextPaces, up.newVdot, Number(goal.distance_m))) {
        check(await supabase.from('iron_run_plan_sessions').update(u.patch).eq('id', u.id))
      }
      await logActions(true)
      await logChange(plan.id, 'paces-up', up.reason, { runId: inserted.id })
      logged.push({ type: 'paces-up', reason: up.reason })
    }
  }
  if (!newVdot) await logActions(false)

  // Session changes: rest days, swaps and holds.
  const upcoming = state.sessions.filter((s) => s.date > run.date && s.status === 'planned' && s.id !== sessionId)
  const weekVolumeM = [inserted].concat(state.runs).filter((r) => r.date > addDays(run.date, -7) && r.date <= run.date).reduce((t, r) => t + Number(r.distance_m || 0), 0)
  const adjustments = planAdjustments(actions, upcoming, { runDate: run.date, weekVolumeM })
  for (const a of adjustments) check(await supabase.from('iron_run_plan_sessions').update(a.patch).eq('id', a.id))

  return { actions: logged, adjustments, run: inserted, newVdot }
}

export async function deleteRun(id) {
  const run = check(await supabase.from('iron_runs').select('plan_session_id').eq('id', id).single())
  check(await supabase.from('iron_runs').delete().eq('id', id))
  if (run.plan_session_id) await supabase.from('iron_run_plan_sessions').update({ status: 'planned' }).eq('id', run.plan_session_id)
}

export async function endGoal(goalId, status) {
  check(await supabase.from('iron_run_plans').update({ active: false }).eq('goal_id', goalId))
  check(await supabase.from('iron_run_goals').update({ status }).eq('id', goalId))
}

/** VDOT from what the user knows about their running today. */
export function vdotFromAssessment(a) {
  if (a.kind === 'race') return { vdot: vdotFromRace(a.distanceM, a.timeS), source: 'race' }
  if (a.kind === 'easy') {
    // A comfortable run sits inside E pace. Assume the fast end so the estimate errs low.
    return { vdot: Math.max(20, impliedVdot(a.timeS / (a.distanceM / 1000), 0.74)), source: 'inferred' }
  }
  // Brand new: a deliberately cautious guess (about a 39:30 5K). Run-walk comes first, and the
  // week 4 time trial replaces this with a real reading.
  return { vdot: 22, source: 'setup' }
}

/** A compact summary of the running plan for the AI coach. Engine numbers only. */
export function runningCoachContext(state) {
  if (!state || !state.goal || !state.plan) {
    return state && state.runs && state.runs.length ? 'No active running goal. ' + state.runs.length + ' runs logged.' : ''
  }
  const { goal, plan, sessions, runs, changes } = state
  const u = (goal.setup && goal.setup.units) || 'km'
  const f = u === 'mi' ? 1 / 1.609344 : 1
  const km = (m) => (Number(m) / 1000 * f).toFixed(1) + ' ' + u
  const pace = (r) => (r ? clock(r.fast / f) + ' to ' + clock(r.slow / f) + ' /' + u : '')
  const today = todayStr()
  const lines = []
  lines.push('Goal: ' + km(goal.distance_m) + ' race in ' + clock(Number(goal.target_time_s)) + ' on ' + goal.goal_date + ' (' + daysBetween(today, goal.goal_date) + ' days away).')
  lines.push('Current fitness (VDOT): ' + Number(plan.current_vdot).toFixed(1) + '. Run days per week: ' + (goal.setup.days || '?') + '. Experience: ' + (goal.setup.level || '?') + (goal.setup.injury === 'recent' ? ', coming back from injury' : '') + '.')
  const p = plan.paces || {}
  lines.push('Training paces: easy ' + pace(p.easy) + '; marathon ' + pace(p.marathon) + '; threshold ' + pace(p.threshold) + '; interval ' + pace(p.interval) + '; repetition ' + pace(p.repetition) + '.')
  const upcoming = sessions.filter((s) => s.date >= today && s.type !== 'strength').slice(0, 10)
  if (upcoming.length) lines.push('Next sessions: ' + upcoming.map((s) => s.date + ' ' + s.type + (s.distance_m ? ' ' + km(s.distance_m) : '') + (s.status !== 'planned' ? ' (' + s.status + ')' : '')).join('; '))
  const recent = runs.slice(0, 10)
  if (recent.length) lines.push('Recent runs, newest first: ' + recent.map((r) => r.date + ' ' + km(r.distance_m) + ' in ' + clock(Number(r.duration_s)) + (r.rpe != null ? ' effort ' + Number(r.rpe) : '') + (r.pain && r.pain !== 'none' ? ' pain ' + r.pain : '') + (r.notes ? ' "' + String(r.notes).slice(0, 80) + '"' : '')).join('; '))
  const ch = changes.slice(0, 5)
  if (ch.length) lines.push('Recent plan changes: ' + ch.map((c) => c.created_at.slice(0, 10) + ' ' + c.reason).join(' | '))
  return lines.join('\n').slice(0, 4000)
}

function clock(totalS) {
  const s = Math.round(totalS)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? h + ':' + String(m).padStart(2, '0') + ':' + sec : m + ':' + sec
}

/**
 * Ask the AI coach to personalize a freshly built plan (api/run-plan.js). Runs in the background
 * after setup. Only applies while the plan is untouched (version 1), so it never overwrites
 * adjustments made after logged runs. Returns the coach's note, or null when the code-built plan
 * stays (not configured, timed out, or no valid proposal).
 */
export async function personalizePlan() {
  const state = await loadRunning()
  const { goal, plan } = state
  if (!goal || !plan || (plan.version || 1) !== 1 || (plan.phases && plan.phases.source === 'ai')) return null
  const sess = await supabase.auth.getSession()
  const token = sess && sess.data && sess.data.session ? sess.data.session.access_token : ''
  const today = todayStr()
  let out
  try {
    const res = await fetch('/api/run-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        goal: { distance_m: goal.distance_m, target_time_s: goal.target_time_s, goal_date: goal.goal_date, setup: goal.setup },
        vdot: Number(plan.current_vdot),
        startWeeklyM: (goal.setup && goal.setup.weeklyM) || 0,
        today,
      }),
    })
    if (!res.ok) return null
    out = await res.json()
  } catch (e) {
    return null
  }
  if (!out || out.source !== 'ai' || !Array.isArray(out.weeks)) return null

  // Re-check: the user may have logged a run while the coach was working.
  const fresh = check(await supabase.from('iron_run_plans').select('version').eq('id', plan.id).single())
  if ((fresh.version || 1) !== 1) return null
  const { cal } = builderOptions(goal, { vdot: Number(plan.current_vdot), startWeeklyM: 0, today })
  const doneToday = state.sessions.some((s) => s.date === today && s.status === 'done')
  const fromDate = doneToday ? addDays(today, 1) : today
  const aiPlan = { weeks: out.weeks, paces: out.paces }
  const rows = planToRows(aiPlan, { start: cal.start, fromDate, vdot: Number(plan.current_vdot), goalDistanceM: Number(goal.distance_m) })
  check(await supabase.from('iron_run_plan_sessions').delete().eq('plan_id', plan.id).eq('status', 'planned').gte('date', fromDate))
  await insertSessions(plan.id, rows)
  check(await supabase.from('iron_run_plans').update({ phases: Object.assign(phasesJson(aiPlan, cal), { source: 'ai' }), version: 2 }).eq('id', plan.id))
  const note = out.note || 'Your coach personalized your plan.'
  await logChange(plan.id, 'personalized', note)
  return note
}
