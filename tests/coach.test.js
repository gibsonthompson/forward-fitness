import { describe, it, expect, vi, afterEach } from 'vitest'
import handler from '../api/coach.js'

// Server-sent events shaped like the Messages API stream: a text block, then a
// propose_plan_change tool call whose input arrives in pieces.
function sse(events) {
  const text = events.map((e) => 'event: ' + e.type + '\ndata: ' + JSON.stringify(e) + '\n\n').join('')
  return new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(text)); c.close() } }), { status: 200 })
}
const upstreamEvents = [
  { type: 'message_start', message: { id: 'm', content: [] } },
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Moving your threshold run to Friday keeps an easy day before your long run.' } },
  { type: 'content_block_stop', index: 0 },
  { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'tu1', name: 'propose_plan_change', input: {} } },
  { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"summary":"Threshold moved to Friday.","moves":[{"session_id":"abcd1234",' } },
  { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '"new_date":"2026-12-04"}]}' } },
  { type: 'content_block_stop', index: 1 },
  { type: 'message_delta', delta: { stop_reason: 'tool_use' } },
  { type: 'message_stop' },
]

function fakeRes() {
  const out = { status: 0, chunks: [], json: null }
  return {
    out,
    status(c) { out.status = c; return this },
    json(j) { out.json = j; return this },
    writeHead(c) { out.status = c },
    write(s) { out.chunks.push(s) },
    end() {},
  }
}

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('coach endpoint plan proposals', () => {
  it('streams the text and emits a proposal event, offering the tool only with a running plan', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test')
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    const sent = []
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      if (String(url).includes('/auth/v1/user')) return new Response('{}', { status: 200 })
      sent.push(JSON.parse(init.body))
      return sse(upstreamEvents)
    }))
    const res = fakeRes()
    await handler({ method: 'POST', headers: { authorization: 'Bearer t' }, body: { messages: [{ role: 'user', content: 'Can I move Thursday?' }], context: 'x', runningPlan: true } }, res)
    const events = res.out.chunks.join('').trim().split('\n').map((l) => JSON.parse(l))
    expect(events[0]).toEqual({ t: 'text', v: 'Moving your threshold run to Friday keeps an easy day before your long run.' })
    expect(events.find((e) => e.t === 'proposal').v).toEqual({ summary: 'Threshold moved to Friday.', moves: [{ session_id: 'abcd1234', new_date: '2026-12-04' }] })
    expect(sent[0].tools.map((t) => t.name)).toContain('propose_plan_change')
    expect(sent[0].system).toMatch(/Changing their running plan/)

    sent.length = 0
    await handler({ method: 'POST', headers: { authorization: 'Bearer t' }, body: { messages: [{ role: 'user', content: 'Hi' }], context: 'x' } }, fakeRes())
    expect(sent[0].tools.map((t) => t.name)).not.toContain('propose_plan_change')
  })
})
