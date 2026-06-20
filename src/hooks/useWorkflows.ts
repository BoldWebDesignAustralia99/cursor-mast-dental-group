import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface Workflow {
  id: string
  name: string
  description: string | null
  trigger_type: string
  trigger_conditions: unknown
  status: string
  version: number
}

export interface WorkflowStep {
  id: string
  step_order: number
  step_type: string
  config: Record<string, unknown>
  template_body: string | null
}

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: async (): Promise<Workflow[]> => {
      if (isDemoModeEnabled()) {
        return [
          { id: '1', name: 'Low credit alert', description: null, trigger_type: 'credit_low', trigger_conditions: [], status: 'active', version: 1 },
          { id: '2', name: 'Booking confirmation', description: null, trigger_type: 'booking_created', trigger_conditions: [], status: 'active', version: 1 },
        ]
      }
      const { data, error } = await db
        .from('marketing_automations')
        .select('id, name, description, trigger_type, trigger_conditions, status, version')
        .order('name')
      if (error) throw error
      return (data ?? []) as Workflow[]
    },
  })
}

export function useWorkflowSteps(automationId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-steps', automationId],
    enabled: !!automationId,
    queryFn: async (): Promise<WorkflowStep[]> => {
      if (isDemoModeEnabled()) {
        return [{ id: '1', step_order: 1, step_type: 'email', config: {}, template_body: 'Your credits are running low.' }]
      }
      const { data, error } = await db
        .from('automation_steps')
        .select('id, step_order, step_type, config, template_body')
        .eq('automation_id', automationId!)
        .order('step_order')
      if (error) throw error
      return (data ?? []) as WorkflowStep[]
    },
  })
}

export function useWorkflowRuns(automationId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-runs', automationId],
    enabled: !!automationId,
    queryFn: async () => {
      if (isDemoModeEnabled()) return [] as { id: string; status: string; started_at: string }[]
      const { data, error } = await db
        .from('automation_runs')
        .select('id, status, started_at, completed_at, entity_type, entity_id')
        .eq('automation_id', automationId!)
        .order('started_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as { id: string; status: string; started_at: string }[]
    },
  })
}

export function useTrainingJourneys() {
  return useQuery({
    queryKey: ['training-journeys'],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [{ journey_id: '1', journey_name: 'Sales onboarding', total_stages: 5, completed_stages: 2 }]
      }
      const { data, error } = await supabase.rpc('get_training_journeys_list')
      if (error) throw error
      return (data ?? []) as unknown as { journey_id: string; journey_name: string; total_stages: number; completed_stages: number }[]
    },
  })
}

export function useUpdateWorkflowStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (isDemoModeEnabled()) return
      const { error } = await db.from('marketing_automations').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['workflows'] }),
  })
}
