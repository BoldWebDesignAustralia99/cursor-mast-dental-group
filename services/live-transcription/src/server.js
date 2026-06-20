/**
 * Live transcription — Twilio Media Streams + Deepgram + Supabase fan-out
 */
import { createServer } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { createClient } from '@supabase/supabase-js'

const PORT = Number(process.env.PORT ?? 8081)
const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

/** @type {Map<string, Set<WebSocket>>} */
const leadSubscribers = new Map()

/** @type {Map<string, WebSocket>} */
const deepgramByCall = new Map()

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
    if (ws.readyState === WebSocket.OPEN) ws.send(msg)
  }
}

async function persistSegment(callLogId, leadId, speaker, text, isFinal) {
  if (!supabase || !text) return
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

function openDeepgram(callLogId, leadId) {
  if (!DEEPGRAM_KEY || deepgramByCall.has(callLogId)) return null

  const dg = new WebSocket(
    'wss://api.deepgram.com/v1/listen?encoding=mulaw&sample_rate=8000&channels=1&punctuate=true&interim_results=true',
    { headers: { Authorization: `Token ${DEEPGRAM_KEY}` } },
  )

  dg.on('message', (raw) => {
    try {
      const data = JSON.parse(String(raw))
      const alt = data.channel?.alternatives?.[0]
      const text = alt?.transcript?.trim()
      if (!text) return
      const isFinal = data.is_final === true
      const speaker = data.channel_index?.[0] === 0 ? 'patient' : 'rep'
      broadcast(leadId, { type: 'transcript', speaker, text, is_final: isFinal })
      if (isFinal) void persistSegment(callLogId, leadId, speaker, text, true)
    } catch { /* ignore */ }
  })

  dg.on('close', () => deepgramByCall.delete(callLogId))
  deepgramByCall.set(callLogId, dg)
  return dg
}

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, deepgram: Boolean(DEEPGRAM_KEY) }))
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
  if (callLogId && leadId) openDeepgram(callLogId, leadId)

  ws.send(JSON.stringify({ type: 'connected', leadId, callLogId, role, deepgram: Boolean(DEEPGRAM_KEY) }))

  ws.on('message', async (raw) => {
    try {
      const data = JSON.parse(String(raw))

      if (data.event === 'media' && data.media?.payload && callLogId) {
        const dg = deepgramByCall.get(callLogId)
        if (dg?.readyState === WebSocket.OPEN) {
          dg.send(JSON.stringify({ type: 'Audio', data: { payload: data.media.payload } }))
        }
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

      if (data.type === 'demo_segment' && leadId) {
        broadcast(leadId, { type: 'transcript', speaker: data.speaker, text: data.text, is_final: true })
        if (callLogId) await persistSegment(callLogId, leadId, data.speaker, data.text, true)
      }
    } catch { /* ignore */ }
  })

  ws.on('close', () => {
    if (leadId) unsubscribe(leadId, ws)
    if (callLogId) {
      deepgramByCall.get(callLogId)?.close()
      deepgramByCall.delete(callLogId)
    }
  })
})

server.listen(PORT, () => {
  console.log(`Live transcription on :${PORT} (deepgram=${Boolean(DEEPGRAM_KEY)})`)
})
