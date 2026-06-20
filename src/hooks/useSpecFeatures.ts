import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useResolveClassificationReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, decision, notes }: { id: string; decision: string; notes?: string }) => {
      if (isDemoModeEnabled()) return
      const { error } = await db.rpc('resolve_classification_review', {
        p_review_id: id,
        p_decision: decision,
        p_notes: notes ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['classification-reviews'] }),
  })
}

export function useToggleOnboardingItem(clinicId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemKey, complete }: { itemKey: string; complete: boolean }) => {
      if (isDemoModeEnabled() || !clinicId) return
      const { error } = await db.rpc('toggle_clinic_onboarding_item', {
        p_clinic_id: clinicId,
        p_item_key: itemKey,
        p_complete: complete,
      })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['clinic-onboarding', clinicId] }),
  })
}

export function useActiveTimesheet() {
  return useQuery({
    queryKey: ['active-timesheet'],
    queryFn: async () => {
      if (isDemoModeEnabled()) return null
      const { data, error } = await db.rpc('get_active_timesheet')
      if (error) throw error
      const row = (data as unknown as { id: string; clock_in: string }[] | null)?.[0]
      return row ?? null
    },
  })
}

export function useTimesheetClock() {
  const qc = useQueryClient()
  const clockIn = useMutation({
    mutationFn: async () => {
      if (isDemoModeEnabled()) return
      const { error } = await db.rpc('timesheet_clock_in')
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['active-timesheet'] })
      void qc.invalidateQueries({ queryKey: ['timesheets'] })
    },
  })
  const clockOut = useMutation({
    mutationFn: async () => {
      if (isDemoModeEnabled()) return
      const { error } = await db.rpc('timesheet_clock_out')
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['active-timesheet'] })
      void qc.invalidateQueries({ queryKey: ['timesheets'] })
    },
  })
  return { clockIn, clockOut }
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { leaveType: string; startDate: string; endDate: string; notes?: string }) => {
      if (isDemoModeEnabled()) return
      const { error } = await db.rpc('create_leave_request', {
        p_leave_type: input.leaveType,
        p_start_date: input.startDate,
        p_end_date: input.endDate,
        p_notes: input.notes ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  })
}

export function useCreateCommunityPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) => {
      if (isDemoModeEnabled()) return
      const { error } = await db.rpc('create_community_post', { p_body: body })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['community-posts'] }),
  })
}

export function useMessageChannels() {
  return useQuery({
    queryKey: ['message-channels'],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [{ id: 'demo', name: 'Sales team', is_group: true, member_count: 5 }]
      }
      const { data, error } = await db.rpc('get_message_channels')
      if (error) throw error
      return (data ?? []) as { id: string; name: string; is_group: boolean; member_count: number }[]
    },
  })
}

export function useChannelMessages(channelId: string | undefined) {
  return useQuery({
    queryKey: ['channel-messages', channelId],
    enabled: !!channelId,
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [{ id: '1', sender_name: 'Demo', body: 'Hello team', created_at: new Date().toISOString(), is_mine: false }]
      }
      const { data, error } = await db.rpc('get_channel_messages', { p_channel_id: channelId! })
      if (error) throw error
      return (data ?? []) as { id: string; sender_name: string; body: string; created_at: string; is_mine: boolean }[]
    },
  })
}

export function useSendInternalMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ channelId, body }: { channelId: string; body: string }) => {
      if (isDemoModeEnabled()) return
      const { error } = await db.rpc('send_internal_message', {
        p_channel_id: channelId,
        p_body: body,
      })
      if (error) throw error
    },
    onSuccess: (_, { channelId }) => void qc.invalidateQueries({ queryKey: ['channel-messages', channelId] }),
  })
}

export function useResolveCallGrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, decision, newScore }: { id: string; decision: string; newScore?: number }) => {
      if (isDemoModeEnabled()) return
      const { error } = await db.rpc('resolve_call_grade', {
        p_grade_id: id,
        p_decision: decision,
        p_new_score: newScore ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['call-grades-queue'] }),
  })
}

export function useTrainingStages(journeyId: string | undefined) {
  return useQuery({
    queryKey: ['training-stages', journeyId],
    enabled: !!journeyId,
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [{ id: '1', name: 'Intro', stage_type: 'course', sort_order: 1, status: 'not_started' }]
      }
      const { data, error } = await db.rpc('get_training_stages', { p_journey_id: journeyId! })
      if (error) throw error
      return (data ?? []) as { id: string; name: string; stage_type: string; sort_order: number; status: string }[]
    },
  })
}

export function useCompleteTrainingStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (stageId: string) => {
      if (isDemoModeEnabled()) return
      const { error } = await db.rpc('complete_training_stage', { p_stage_id: stageId })
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['training-stages'] })
      void qc.invalidateQueries({ queryKey: ['training-journeys'] })
    },
  })
}

export function useCreateTrainingStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ journeyId, name, stageType }: { journeyId: string; name: string; stageType: string }) => {
      if (isDemoModeEnabled()) return
      const { error } = await db.rpc('create_training_stage', {
        p_journey_id: journeyId,
        p_name: name,
        p_stage_type: stageType,
      })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['training-stages'] }),
  })
}

export function useClinicProposals(clinicId: string | undefined) {
  return useQuery({
    queryKey: ['clinic-proposals', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      if (isDemoModeEnabled()) return [{ id: '1', title: 'Starter package', status: 'draft', total_cents: 450000, created_at: new Date().toISOString() }]
      const { data, error } = await db.rpc('get_clinic_proposals', { p_clinic_id: clinicId! })
      if (error) throw error
      return (data ?? []) as { id: string; title: string; status: string; total_cents: number; created_at: string }[]
    },
  })
}

export function useCreateClinicProposal(clinicId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ title, totalCents }: { title: string; totalCents: number }) => {
      if (isDemoModeEnabled() || !clinicId) return
      const { error } = await db.rpc('create_clinic_proposal', {
        p_clinic_id: clinicId,
        p_title: title,
        p_total_cents: totalCents,
      })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['clinic-proposals', clinicId] }),
  })
}

export function useClinicContacts(clinicId: string | undefined) {
  return useQuery({
    queryKey: ['clinic-contacts', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      if (isDemoModeEnabled()) return [{ id: '1', full_name: 'Dr Smith', email: 'dr@clinic.com', phone: null, role: 'Owner', is_primary: true }]
      const { data, error } = await db.rpc('get_clinic_contacts', { p_clinic_id: clinicId! })
      if (error) throw error
      return (data ?? []) as { id: string; full_name: string; email: string | null; phone: string | null; role: string | null; is_primary: boolean }[]
    },
  })
}

export function useCreateClinicContact(clinicId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { fullName: string; email?: string; phone?: string; role?: string }) => {
      if (isDemoModeEnabled() || !clinicId) return
      const { error } = await db.rpc('upsert_clinic_contact', {
        p_clinic_id: clinicId,
        p_full_name: input.fullName,
        p_email: input.email ?? null,
        p_phone: input.phone ?? null,
        p_role: input.role ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['clinic-contacts', clinicId] }),
  })
}

export function useUpdateRoutingWeight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { zoneId: string; clinicId: string; weight: number; cap?: number }) => {
      if (isDemoModeEnabled()) return
      const { error } = await db.rpc('update_routing_weight', {
        p_zone_id: input.zoneId,
        p_clinic_id: input.clinicId,
        p_weight: input.weight,
        p_cap: input.cap ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['routing-matrix'] }),
  })
}

export function useSendClinicReply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clinicId, body }: { clinicId: string; body: string }) => {
      if (isDemoModeEnabled()) return
      const { error } = await db.rpc('send_clinic_comms_reply', {
        p_clinic_id: clinicId,
        p_body: body,
      })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['comms-inbox'] }),
  })
}

export function useCreateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; triggerType: string; description?: string }) => {
      if (isDemoModeEnabled()) return 'demo'
      const { data, error } = await db.rpc('create_workflow', {
        p_name: input.name,
        p_trigger_type: input.triggerType,
        p_description: input.description ?? null,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['workflows'] }),
  })
}

export function useAddWorkflowStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ automationId, stepType, templateBody }: { automationId: string; stepType: string; templateBody?: string }) => {
      if (isDemoModeEnabled()) return
      const { error } = await db.rpc('add_workflow_step', {
        p_automation_id: automationId,
        p_step_type: stepType,
        p_template_body: templateBody ?? null,
      })
      if (error) throw error
    },
    onSuccess: (_, { automationId }) => void qc.invalidateQueries({ queryKey: ['workflow-steps', automationId] }),
  })
}

export function useClinicAvailableSlots(clinicId: string | undefined, date: string) {
  return useQuery({
    queryKey: ['clinic-slots', clinicId, date],
    enabled: !!clinicId && !!date,
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [{ slot_start: `${date}T09:00:00Z`, slot_end: `${date}T10:00:00Z`, practitioner_name: 'Dr Demo' }]
      }
      const { data, error } = await db.rpc('get_available_slots', {
        p_clinic_id: clinicId!,
        p_date: date,
      })
      if (error) throw error
      return (data ?? []) as { slot_start: string; slot_end: string; practitioner_name: string }[]
    },
  })
}

export function useClinicAvailableDates(clinicId: string | undefined, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['clinic-dates', clinicId, startDate, endDate],
    enabled: !!clinicId,
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [{ available_date: startDate, slot_count: 5 }]
      }
      const { data, error } = await db.rpc('get_available_dates', {
        p_clinic_id: clinicId!,
        p_start_date: startDate,
        p_end_date: endDate,
      })
      if (error) throw error
      return (data ?? []) as { available_date: string; slot_count: number }[]
    },
  })
}
