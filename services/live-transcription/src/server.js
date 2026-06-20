/**
 * Live transcription WebSocket service (§8.2)
 * Twilio Media Streams → transcript segments → Supabase + client fan-out
 *
 * Env: PORT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEEPGRAM_API_KEY (optional)
 */
import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import { createClient } from '@supabase/supabase-js'

const PORT = Number(process.env.PORT ?? 8081)
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const leadSubscribers = new Map()

function subscribe(leadId, ws) {
  if (!leadSubscribers.has(leadId)) leadSubscribers.set(leadId, new Set())
  leadSubscribers.get(leadId).add(ws)
}

function unsubscribe(leadId, ws) {
  leadSubscribers.get(leadId)?.delete(ws)
}

function broadcast(leadId, payload) {
  const msg = JSON.stringify(payload)
  for (const ws of leadSubscribers.get(leadId) ?? []) {
    if (ws.readyState === 1) ws.send(msg)
  }
}

async function persistSegment(callLogId, leadId, speaker, text, isFinal) {
  if (!supabase) return
  await supabase.rpc('append_transcript_segment', {
    p_call_log_id: callLogId,
    p_speaker: speaker,
    p_text: text,
    p_is_final: isFinal,
  })
  if (leadId) {
    await supabase.channel(`transcript:${leadId}`).send({
      type: 'broadcast',
      event: 'segment',
      payload: { speaker, text, is_final: isFinal },
    })
  }
}

const server = createServer((_req, res) => {
  if (_req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'live-transcription' }))
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  const leadId = url.searchParams.get('leadId')
  const callLogId = url.searchParams.get('callLogId')
  const role = url.searchParams.get('role') ?? 'client'

  if (leadId) subscribe(leadId, ws)

  ws.send(JSON.stringify({ type: 'connected', leadId, callLogId, role }))

  ws.on('message', async (raw) => {
    try {
      const data = JSON.parse(String(raw))

      // Twilio Media Stream format (simplified)
      if (data.event === 'media' && data.media?.payload) {
        // In production: forward mulaw audio to Deepgram streaming API
        return
      }

      if (data.event === 'transcript' || data.type === 'transcript') {
        const segment = {
          speaker: data.speaker ?? 'patient',
          text: data.text ?? '',
          is_final: data.is_final ?? true,
        }
        if (leadId) broadcast(leadId, { type: 'transcript', ...segment })
        if (callLogId && segment.text) {
          await persistSegment(callLogId, leadId, segment.speaker, segment.text, segment.is_final)
        }
      }

      // Demo/simulated transcript injection from client
      if (data.type === 'demo_segment' && leadId) {
        broadcast(leadId, { type: 'transcript', speaker: data.speaker, text: data.text, is_final: true })
        if (callLogId) await persistSegment(callLogId, leadId, data.speaker, data.text, true)
      }
    } catch {
      /* ignore malformed */
    }
  })

  ws.on('close', () => {
    if (leadId) unsubscribe(leadId, ws)
  })
})

server.listen(PORT, () => {
  console.log(`Live transcription service on :${PORT}`)
})
