import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'

export interface BookingDetail {
  id: string
  lead_id: string
  clinic_id: string
  clinic_name: string
  patient_first_name: string
  patient_last_name: string
  patient_phone: string
  scheduled_start: string
  scheduled_end: string
  status: string
  outcome: string
  deposit_status: string
  rep_notes: string | null
  ai_summary: string | null
  classification: string | null
  classification_reasoning: string | null
}

export function useBookingDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['booking', id],
    enabled: !!id,
    queryFn: async (): Promise<BookingDetail | null> => {
      if (isDemoModeEnabled()) {
        return {
          id: id!,
          lead_id: 'c0000001-0000-4000-8000-000000000001',
          clinic_id: 'a0000001-0000-4000-8000-000000000001',
          clinic_name: 'Mast Dental Moorooka',
          patient_first_name: 'Raewyn',
          patient_last_name: 'Mitchell',
          patient_phone: '0412 660 412',
          scheduled_start: new Date().toISOString(),
          scheduled_end: new Date(Date.now() + 3600000).toISOString(),
          status: 'scheduled',
          outcome: 'pending',
          deposit_status: 'none',
          rep_notes: null,
          ai_summary: 'Upper & lower set, superannuation funding',
          classification: 'multi_implant',
          classification_reasoning: 'Patient discussed full arch replacement',
        }
      }
      const { data, error } = await supabase.rpc('get_booking_detail', { p_booking_id: id! })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      return (row as unknown as BookingDetail) ?? null
    },
  })
}

export function useUpdateBookingOutcome() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookingId, outcome }: { bookingId: string; outcome: string }) => {
      if (isDemoModeEnabled()) return
      const { error } = await supabase.rpc('update_booking_outcome', {
        p_booking_id: bookingId,
        p_outcome: outcome,
      })
      if (error) throw error
    },
    onSuccess: (_, { bookingId }) => {
      void qc.invalidateQueries({ queryKey: ['booking', bookingId] })
      void qc.invalidateQueries({ queryKey: ['bookings-list'] })
    },
  })
}

export function useRoutingMatrix() {
  return useQuery({
    queryKey: ['routing-matrix'],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [
          { zone_name: 'North Brisbane', clinic_name: 'Mast Dental North Lakes', weight: 3, cap_per_period: 20, period_count: 8, credit_balance: 8 },
          { zone_name: 'South Brisbane', clinic_name: 'Mast Dental Moorooka', weight: 5, cap_per_period: 30, period_count: 12, credit_balance: 45 },
        ]
      }
      const { data, error } = await supabase.rpc('get_routing_matrix')
      if (error) throw error
      return (data ?? []) as unknown as Record<string, unknown>[]
    },
  })
}

export function useClinicTimeline(clinicId: string | undefined) {
  return useQuery({
    queryKey: ['clinic-timeline', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [
          { item_type: 'activity', summary: 'Clinic created', created_at: new Date().toISOString() },
          { item_type: 'communication', summary: 'Proposal sent', created_at: new Date().toISOString() },
        ]
      }
      const { data, error } = await supabase.rpc('get_clinic_timeline', {
        p_clinic_id: clinicId!,
        p_page: 1,
        p_page_size: 20,
      })
      if (error) throw error
      return (data ?? []) as unknown as { summary: string; created_at: string; item_type?: string; id?: string }[]
    },
  })
}

export function useClinicOnboarding(clinicId: string | undefined) {
  return useQuery({
    queryKey: ['clinic-onboarding', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [
          { item_key: 'portal_accounts', label: 'Portal accounts created', is_complete: true, completed_at: null },
          { item_key: 'calendars', label: 'Calendars configured', is_complete: false, completed_at: null },
        ]
      }
      const { data, error } = await supabase.rpc('get_clinic_onboarding', { p_clinic_id: clinicId! })
      if (error) throw error
      return (data ?? []) as unknown as { item_key: string; label: string; is_complete: boolean }[]
    },
  })
}

export function useClinicLedger(clinicId: string | undefined) {
  return useQuery({
    queryKey: ['clinic-ledger', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      if (isDemoModeEnabled()) return [{ id: '1', amount: -1, balance_after: 44, reason: 'booking_consumed', created_at: new Date().toISOString() }]
      const { data, error } = await supabase.rpc('get_clinic_ledger', { p_clinic_id: clinicId! })
      if (error) throw error
      return (data ?? []) as unknown as { id: string; amount: number; balance_after: number; reason: string; created_at: string }[]
    },
  })
}

export function useCommsInbox() {
  return useQuery({
    queryKey: ['comms-inbox'],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [
          { id: '1', clinic_name: 'Mast Dental Moorooka', body: 'Can we get more bookings next week?', created_at: new Date().toISOString() },
        ]
      }
      const { data, error } = await supabase.rpc('get_clinic_comms_inbox')
      if (error) throw error
      return (data ?? []) as unknown as { id: string; clinic_name: string; body: string; created_at: string }[]
    },
  })
}

export function useClassificationReviews(status = 'pending') {
  return useQuery({
    queryKey: ['classification-reviews', status],
    queryFn: async () => {
      if (isDemoModeEnabled()) return []
      const { data, error } = await supabase.rpc('get_classification_reviews', { p_status: status })
      if (error) throw error
      return (data ?? []) as unknown as { id: string; patient_name: string; proposed_classification: string; status: string; created_at: string }[]
    },
  })
}
