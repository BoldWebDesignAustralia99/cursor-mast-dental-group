import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function usePortalBookings(clinicId?: string) {
  return useQuery({
    queryKey: ['portal-bookings', clinicId],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [
          { id: '1', patient_name: 'Raewyn Mitchell', scheduled_start: new Date().toISOString(), status: 'scheduled', outcome: 'pending' },
        ]
      }
      const { data, error } = await supabase.rpc('get_portal_bookings', {
        p_clinic_id: clinicId ?? undefined,
      })
      if (error) throw error
      return (data ?? []) as unknown as { id: string; patient_name: string; scheduled_start: string; status: string; outcome: string }[]
    },
  })
}

export function usePortalCredits() {
  return useQuery({
    queryKey: ['portal-credits'],
    queryFn: async () => {
      if (isDemoModeEnabled()) return { balance: 45, packages: [{ name: 'Starter — 10 credits', price_cents: 450000 }] }
      const { data: clinics } = await db.from('clinics').select('credit_balance').limit(1).single()
      const { data: packages } = await db.from('credit_packages').select('name, price_cents').eq('is_active', true)
      return { balance: clinics?.credit_balance ?? 0, packages: packages ?? [] }
    },
  })
}

export function usePractitionerSchedule(clinicId?: string) {
  return useQuery({
    queryKey: ['practitioner-schedule', clinicId],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [
          { practitioner_name: 'Dr Evelyn Chin', weekday: 1, start_time: '09:00', end_time: '17:00' },
        ]
      }
      let q = db.from('staff_weekly_schedules').select('weekday, start_time, end_time, practitioners(full_name), clinic_id')
      if (clinicId) q = q.eq('clinic_id', clinicId)
      const { data, error } = await q
      if (error) throw error
      return ((data ?? []) as { weekday: number; start_time: string; end_time: string; practitioners: { full_name: string } | null }[]).map((r) => ({
        practitioner_name: r.practitioners?.full_name ?? 'Unknown',
        weekday: r.weekday,
        start_time: r.start_time,
        end_time: r.end_time,
      }))
    },
  })
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (isDemoModeEnabled()) return
      const { error } = await supabase.rpc('mark_notifications_read', { p_ids: ids })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
