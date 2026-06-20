import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'

export type CallStatus = 'idle' | 'connecting' | 'in-progress' | 'on-hold' | 'ended'

interface UseTwilioCallOptions {
  leadId: string
  phoneNumber: string
  identity?: string
  onCallLogId?: (id: string) => void
}

export function useTwilioCall({ leadId, phoneNumber, identity, onCallLogId }: UseTwilioCallOptions) {
  const [status, setStatus] = useState<CallStatus>('idle')
  const [muted, setMuted] = useState(false)
  const [onHold, setOnHold] = useState(false)
  const [callLogId, setCallLogId] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const deviceRef = useRef<{ disconnectAll: () => void; destroy: () => void } | null>(null)
  const connectionRef = useRef<{ mute: (v: boolean) => void; disconnect: () => void } | null>(null)

  const startCallLog = useCallback(async () => {
    if (isDemoModeEnabled()) {
      const demoId = crypto.randomUUID()
      setCallLogId(demoId)
      onCallLogId?.(demoId)
      return demoId
    }
    const { data, error } = await (supabase as any).rpc('start_call_log', {
      p_lead_id: leadId,
      p_to_number: phoneNumber,
    })
    if (error) throw error
    const id = data as string
    setCallLogId(id)
    onCallLogId?.(id)
    return id
  }, [leadId, phoneNumber, onCallLogId])

  const connect = useCallback(async () => {
    if (status === 'in-progress' || status === 'connecting') return
    setStatus('connecting')
    try {
      await startCallLog()
      const tokenRes = await api.twilioToken(identity ?? leadId)

      if (!tokenRes.configured || !tokenRes.token || tokenRes.token.includes('stub')) {
        setIsLive(false)
        setStatus('in-progress')
        toast.message('Demo call mode — configure Twilio secrets for live dialing')
        return
      }

      const { Device } = await import('@twilio/voice-sdk')
      const device = new Device(tokenRes.token, { closeProtection: true })
      deviceRef.current = device

      device.on('error', (err: Error) => {
        toast.error(err.message)
        setStatus('ended')
      })

      const connection = await device.connect({
        params: { To: phoneNumber, leadId, callLogId: callLogId ?? '' },
      })
      connectionRef.current = connection
      setIsLive(true)
      setStatus('in-progress')

      connection.on('disconnect', () => {
        setStatus('ended')
        setIsLive(false)
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start call')
      setStatus('idle')
    }
  }, [status, startCallLog, identity, leadId, phoneNumber, callLogId])

  const hangUp = useCallback(() => {
    connectionRef.current?.disconnect()
    deviceRef.current?.disconnectAll()
    setOnHold(false)
    setStatus('ended')
  }, [])

  const toggleMute = useCallback(() => {
    const next = !muted
    connectionRef.current?.mute(next)
    setMuted(next)
  }, [muted])

  const toggleHold = useCallback(() => {
    setOnHold((h) => !h)
    toast.message(onHold ? 'Resumed call' : 'Call on hold')
  }, [onHold])

  useEffect(() => {
    return () => {
      deviceRef.current?.destroy()
    }
  }, [])

  return {
    status,
    muted,
    onHold,
    callLogId,
    isLive,
    connect,
    hangUp,
    toggleMute,
    toggleHold,
    setMuted,
    setOnHold,
  }
}
