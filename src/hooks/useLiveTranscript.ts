import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface TranscriptLine {
  id: string
  speaker: string
  text: string
  isFinal: boolean
}

const DEMO_LINES: TranscriptLine[] = [
  { id: '1', speaker: 'rep', text: 'So tell me about your current situation with your teeth.', isFinal: true },
  { id: '2', speaker: 'patient', text: 'I have upper and lower missing molars, wearing a partial plate.', isFinal: true },
  { id: '3', speaker: 'patient', text: 'My husband David wants to look at superannuation funding.', isFinal: true },
]

const WS_URL = import.meta.env.VITE_TRANSCRIPTION_WS_URL ?? 'ws://localhost:8081'

export function useLiveTranscript(leadId: string, callLogId: string | null, enabled = true) {
  const [lines, setLines] = useState<TranscriptLine[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const demoTimerRef = useRef<number | null>(null)

  const appendLine = useCallback((speaker: string, text: string, isFinal = true) => {
    setLines((prev) => {
      const last = prev[prev.length - 1]
      if (last && !last.isFinal && last.speaker === speaker) {
        return [...prev.slice(0, -1), { ...last, text, isFinal }]
      }
      return [...prev, { id: crypto.randomUUID(), speaker, text, isFinal }]
    })
  }, [])

  useEffect(() => {
    if (!enabled || !leadId) return

    if (isDemoModeEnabled()) {
      setLines(DEMO_LINES)
      let i = 0
      demoTimerRef.current = window.setInterval(() => {
        if (i >= DEMO_LINES.length) return
        setLines(DEMO_LINES.slice(0, i + 1))
        i += 1
      }, 1200)
      return () => {
        if (demoTimerRef.current) clearInterval(demoTimerRef.current)
      }
    }

    const channel = supabase
      .channel(`transcript:${leadId}`)
      .on('broadcast', { event: 'segment' }, ({ payload }) => {
        const p = payload as { speaker?: string; text?: string; is_final?: boolean }
        if (p.text) appendLine(p.speaker ?? 'unknown', p.text, p.is_final ?? true)
      })
      .subscribe()

    const params = new URLSearchParams({ leadId, role: 'client' })
    if (callLogId) params.set('callLogId', callLogId)

    try {
      const ws = new WebSocket(`${WS_URL}?${params}`)
      wsRef.current = ws
      ws.onopen = () => setConnected(true)
      ws.onclose = () => setConnected(false)
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(String(ev.data)) as { type?: string; speaker?: string; text?: string; is_final?: boolean }
          if (data.type === 'transcript' && data.text) {
            appendLine(data.speaker ?? 'unknown', data.text, data.is_final ?? true)
          }
        } catch {
          /* ignore */
        }
      }
    } catch {
      setConnected(false)
    }

    void db
      .from('live_transcript_segments')
      .select('id, speaker, text, is_final')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true })
      .then(({ data }: { data: { id: string; speaker: string; text: string; is_final: boolean }[] | null }) => {
        if (data?.length) {
          setLines(
            data.map((r) => ({
              id: r.id,
              speaker: r.speaker,
              text: r.text,
              isFinal: r.is_final,
            })),
          )
        }
      })

    return () => {
      channel.unsubscribe()
      wsRef.current?.close()
    }
  }, [leadId, callLogId, enabled, appendLine])

  const injectDemoSegment = useCallback(
    (speaker: string, text: string) => {
      appendLine(speaker, text, true)
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'demo_segment', speaker, text }))
      }
    },
    [appendLine],
  )

  return { lines, connected, injectDemoSegment }
}
