import { describe, it, expect } from 'vitest'
import { personalizePlan } from '../api/run-plan.js'
import { buildPlan, builderOptions, toCompact } from '../src/lib/running/index.js'

const goal = { distance_m: 10000, target_time_s: 3000, goal_date: '2027-03-14', setup: { days: 4, longWeekday: 6, level: 'intermediate', injury: 'none', longestM: 12000 } }
const input = { goal, vdot: 42, startWeeklyM: 25000, today: '2026-11-28' }

// A scripted stand-in for the Anthropic client: returns the queued messages in order and
// records every request it received.
function scripted(replies) {
  const calls = []
  return {
    calls,
    beta: { messages: { stream: (params) => { calls.push(JSON.parse(JSON.stringify(params))); const m = replies.shift(); return { finalMessage: async () => m } } } },
  }
}
const submit = (weeks, note = 'Kept your long run near your recent 12 km.') => ({
  stop_reason: 'tool_use',
  content: [{ type: 'tool_use', id: 'tu' + Math.random(), name: 'submit_plan', input: { coach_note: note, weeks } }],
})
const baselineCompact = () => {
  const { opts } = builderOptions(goal, { vdot: 42, startWeeklyM: 25000, today: '2026-11-28' })
  return toCompact(buildPlan(opts))
}

describe('AI plan personalization loop', () => {
  it('accepts a valid plan and returns it expanded, with paces from code', async () => {
    const client = scripted([submit(baselineCompact())])
    const out = await personalizePlan(input, client)
    expect(out.source).toBe('ai')
    expect(out.note).toMatch(/long run/)
    expect(out.weeks.length).toBe(baselineCompact().length)
    expect(out.paces.easy.fast).toBeGreaterThan(0)
    const req = client.calls[0]
    expect(req.model).toBe('claude-sonnet-5-5')
    expect(req.fallbacks).toBe('default')
    expect(req.tools.find((t) => t.name === 'submit_plan').strict).toBe(true)
  })

  it('sends guardrail errors back and accepts the fixed plan', async () => {
    const bad = baselineCompact()
    bad[1].sessions.forEach((s) => { if (s.type === 'long') s.km = 40 }) // long run far too long
    const client = scripted([submit(bad), submit(baselineCompact())])
    const out = await personalizePlan(input, client)
    expect(out.source).toBe('ai')
    const feedback = client.calls[1].messages.at(-1).content[0]
    expect(feedback.is_error).toBe(true)
    expect(feedback.content).toMatch(/long run|jumps/i)
  })

  it('falls back to the baseline after repeated invalid plans', async () => {
    const bad = baselineCompact().slice(1) // wrong number of weeks
    const client = scripted([submit(bad), submit(bad), submit(bad)])
    const out = await personalizePlan(input, client)
    expect(out).toEqual({ source: 'baseline', reason: 'invalid' })
    expect(client.calls.length).toBe(3)
  })

  it('answers engine tools and falls back when the model never submits', async () => {
    const client = scripted([
      { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'a', name: 'get_training_paces', input: { vdot: 42 } }] },
      { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Done.' }] },
    ])
    const out = await personalizePlan(input, client)
    expect(out.source).toBe('baseline')
    const toolResult = client.calls[1].messages.at(-1).content[0]
    expect(toolResult.content).toMatch(/threshold/)
  })

  it('never runs a refused or truncated turn', async () => {
    expect((await personalizePlan(input, scripted([{ stop_reason: 'refusal', content: [] }]))).source).toBe('baseline')
    expect((await personalizePlan(input, scripted([{ stop_reason: 'max_tokens', content: [{ type: 'tool_use', id: 'x', name: 'submit_plan', input: {} }] }]))).source).toBe('baseline')
  })
})
