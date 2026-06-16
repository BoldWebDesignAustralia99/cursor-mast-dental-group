import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'
import {
  DEMO_LEAD,
  DEMO_LEAD_ID,
  DEMO_CALL_FLOW,
  DEMO_NOTES,
  DEMO_CLINICS,
  DEMO_SLOTS,
  DEMO_QUEUE,
} from '@/lib/demo-data'
import { PAGE_SIZE } from '@/lib/constants'

export interface Lead {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  suburb: string | null
  state: string | null
  source: string
  stage: string
  treatment_interest: string | null
  funding_type: string | null
  decision_maker: string | null
  call_count: number
  notes: string | null
  next_callback_at: string | null
  last_contact_at: string | null
  created_at: string
}

export interface CallFlowStage {
  id: string
  name: string
  time_range: string | null
  script_content?: string | null
  sort_order: number
}

export interface LeadNote {
  id: string
  body: string
  source: 'ai' | 'user'
  created_at: string
}

export interface SuggestedClinic {
  clinic_id: string
  clinic_name: string
  suburb: string
  distance_km: number
  drive_time_min: number
  credit_balance: number
  has_senior: boolean
  senior_visiting: boolean
  is_recommended: boolean
}

export interface TimeSlot {
  slot_start: string
  practitioner_name: string
  is_senior: boolean
  label: string
}

export interface QueueLead {
  id: string
  first_name: string
  last_name: string
  phone: string
  suburb: string | null
  stage: string
  call_count: number
  treatment_interest: string | null
  next_callback_at: string | null
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    enabled: !!id,
    queryFn: async (): Promise<Lead> => {
      if (isDemoModeEnabled()) return DEMO_LEAD as Lead

      const { data, error } = await supabase
        .from('leads')
        .select(
          'id, first_name, last_name, phone, email, suburb, state, source, stage, treatment_interest, funding_type, decision_maker, call_count, notes, next_callback_at, last_contact_at, created_at',
        )
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Lead
    },
  })
}

export function useCallFlowStages() {
  return useQuery({
    queryKey: ['call-flow-stages'],
    queryFn: async (): Promise<CallFlowStage[]> => {
      if (isDemoModeEnabled()) return DEMO_CALL_FLOW as CallFlowStage[]

      const { data, error } = await supabase
        .from('call_flow_stages')
        .select('id, name, time_range, script_content, sort_order')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data as CallFlowStage[]
    },
  })
}

export function useLeadNotes(leadId: string) {
  return useQuery({
    queryKey: ['leads', leadId, 'notes'],
    enabled: !!leadId,
    queryFn: async (): Promise<LeadNote[]> => {
      if (isDemoModeEnabled()) return DEMO_NOTES

      const { data, error } = await supabase
        .from('communications')
        .select('id, body, transcript_summary, channel, created_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []).map((c) => ({
        id: c.id,
        body: c.transcript_summary ?? c.body ?? '',
        source: (c.channel === 'phone' ? 'ai' : 'user') as 'ai' | 'user',
        created_at: c.created_at,
      }))
    },
  })
}

export function useSuggestedClinics(leadId: string) {
  return useQuery({
    queryKey: ['leads', leadId, 'clinics'],
    enabled: !!leadId,
    queryFn: async (): Promise<SuggestedClinic[]> => {
      if (isDemoModeEnabled()) return DEMO_CLINICS

      const { data, error } = await supabase.rpc('get_suggested_clinics', {
        p_lead_id: leadId,
      })
      if (error) throw error
      return (data ?? []) as unknown as SuggestedClinic[]
    },
  })
}

export function useAvailableSlots(clinicId: string, date: string) {
  return useQuery({
    queryKey: ['slots', clinicId, date],
    enabled: !!clinicId && !!date,
    queryFn: async (): Promise<TimeSlot[]> => {
      if (isDemoModeEnabled()) return DEMO_SLOTS

      const { data, error } = await supabase.rpc('get_available_slots', {
        p_clinic_id: clinicId,
        p_date: date,
      })
      if (error) throw error
      return ((data ?? []) as { slot_start: string; practitioner_name: string; is_senior: boolean }[]).map((s) => ({
        ...s,
        label: new Date(s.slot_start).toLocaleTimeString('en-AU', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      }))
    },
  })
}

export function useCallQueue(page = 1) {
  return useQuery({
    queryKey: ['call-queue', page],
    queryFn: async (): Promise<{ rows: QueueLead[]; total: number }> => {
      if (isDemoModeEnabled()) {
        return { rows: DEMO_QUEUE as QueueLead[], total: DEMO_QUEUE.length }
      }

      const { data, error } = await supabase.rpc('get_call_queue', {
        p_page: page,
        p_page_size: PAGE_SIZE,
      })
      if (error) throw error
      const rows = (data ?? []) as unknown as (QueueLead & { total_count?: number })[]
      const total = rows[0]?.total_count ?? 0
      return { rows, total: Number(total) }
    },
  })
}

export function useLeadsList(search: string, stage: string | null, page = 1) {
  return useQuery({
    queryKey: ['leads-list', search, stage, page],
    queryFn: async (): Promise<{ rows: QueueLead[]; total: number }> => {
      if (isDemoModeEnabled()) {
        return { rows: DEMO_QUEUE as QueueLead[], total: DEMO_QUEUE.length }
      }

      const { data, error } = await supabase.rpc('get_leads_list', {
        p_search: search || undefined,
        p_stage: stage ?? undefined,
        p_page: page,
        p_page_size: PAGE_SIZE,
      })
      if (error) throw error
      const rows = (data ?? []) as unknown as (QueueLead & { total_count?: number })[]
      const total = rows[0]?.total_count ?? 0
      return { rows, total: Number(total) }
    },
  })
}

export function useAddLeadNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ leadId, body }: { leadId: string; body: string }) => {
      if (isDemoModeEnabled()) return

      const { error } = await supabase.from('communications').insert({
        lead_id: leadId,
        channel: 'internal_note',
        direction: 'internal',
        body,
      })
      if (error) throw error
    },
    onSuccess: (_, { leadId }) => {
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'notes'] })
    },
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      leadId: string
      clinicId: string
      practitionerId: string
      scheduledStart: string
      scheduledEnd: string
      repNotes?: string
    }) => {
      if (isDemoModeEnabled()) return 'demo-booking-id'

      const { data, error } = await supabase.rpc('create_booking', {
        p_lead_id: params.leadId,
        p_clinic_id: params.clinicId,
        p_practitioner_id: params.practitionerId,
        p_scheduled_start: params.scheduledStart,
        p_scheduled_end: params.scheduledEnd,
        p_rep_notes: params.repNotes ?? null,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] })
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

export { DEMO_LEAD_ID }
