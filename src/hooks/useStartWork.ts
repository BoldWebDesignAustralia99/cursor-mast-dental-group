import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'
import { DEMO_LEAD_ID } from '@/lib/demo-data'

export type QueueType = 'frontline' | 'reactivation'

export interface StartWorkResult {
  lead_id: string | null
  lock_acquired: boolean
  allocation_reason: string
}

export function useStartWork() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (queueType: QueueType = 'frontline'): Promise<StartWorkResult> => {
      if (isDemoModeEnabled()) {
        return {
          lead_id: DEMO_LEAD_ID,
          lock_acquired: true,
          allocation_reason: 'demo',
        }
      }

      const { data, error } = await supabase.rpc('start_work', {
        p_queue_type: queueType,
      })
      if (error) throw error

      const row = Array.isArray(data) ? data[0] : data
      return row as StartWorkResult
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['call-queue'] })

      if (!result.lead_id) {
        toast.info('No leads available right now. Check back shortly.')
        return
      }

      if (!result.lock_acquired) {
        toast.error('That lead is being worked by another rep. Trying again…')
        return
      }

      navigate(`/leads/${result.lead_id}`)
    },
    onError: () => {
      toast.error('Could not start work. Please try again.')
    },
  })
}

export function useLeadLock(leadId: string) {
  const acquire = async (): Promise<boolean> => {
    if (isDemoModeEnabled()) return true

    const { data, error } = await supabase.rpc('acquire_lead_lock', {
      p_lead_id: leadId,
      p_queue_type: 'frontline',
    })
    if (error) throw error
    return data as boolean
  }

  const heartbeat = async (): Promise<boolean> => {
    if (isDemoModeEnabled()) return true

    const { data, error } = await supabase.rpc('heartbeat_lead_lock', {
      p_lead_id: leadId,
    })
    if (error) throw error
    return data as boolean
  }

  const release = async (reason = 'manual'): Promise<boolean> => {
    if (isDemoModeEnabled()) return true

    const { data, error } = await supabase.rpc('release_lead_lock', {
      p_lead_id: leadId,
      p_reason: reason,
    })
    if (error) throw error
    return data as boolean
  }

  return { acquire, heartbeat, release }
}
