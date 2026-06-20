import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'
import { DEMO_DASHBOARD } from '@/lib/demo-data'
import { PAGE_SIZE } from '@/lib/constants'

export interface DashboardStats {
  open_leads: number
  bookings_today: number
  shows_this_week: number
  callbacks_due: number
  open_tasks: number
}

export interface BookingRow {
  id: string
  patient_first_name: string
  patient_last_name: string
  patient_phone: string
  clinic_name: string
  scheduled_start: string
  status: string
  outcome: string
  deposit_status: string
}

export interface ClinicRow {
  id: string
  name: string
  suburb: string
  stage: string
  credit_balance: number
  country: string
  is_active: boolean
}

export interface NotificationRow {
  id: string
  event_type: string
  title: string
  body: string | null
  is_read: boolean
  created_at: string
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      if (isDemoModeEnabled()) return DEMO_DASHBOARD

      const { data, error } = await supabase
        .from('dashboard_stats')
        .select('open_leads, bookings_today, shows_this_week, callbacks_due, open_tasks')
        .single()
      if (error) throw error
      return data as DashboardStats
    },
    staleTime: 30_000,
  })
}

export function useBookingsList(search: string, page = 1) {
  return useQuery({
    queryKey: ['bookings-list', search, page],
    queryFn: async (): Promise<{ rows: BookingRow[]; total: number }> => {
      if (isDemoModeEnabled()) {
        return {
          rows: [
            {
              id: '1',
              patient_first_name: 'Raewyn',
              patient_last_name: 'Mitchell',
              patient_phone: '0412 660 412',
              clinic_name: 'Mast Dental Moorooka',
              scheduled_start: new Date().toISOString(),
              status: 'scheduled',
              outcome: 'pending',
              deposit_status: 'none',
            },
          ],
          total: 1,
        }
      }

      const { data, error } = await supabase.rpc('get_bookings_list', {
        p_search: search || undefined,
        p_page: page,
        p_page_size: PAGE_SIZE,
      })
      if (error) throw error
      const rows = (data ?? []) as unknown as (BookingRow & { total_count?: number })[]
      return { rows, total: Number(rows[0]?.total_count ?? 0) }
    },
  })
}

export function useClinicsList(stage: string | null, page = 1) {
  return useQuery({
    queryKey: ['clinics-list', stage, page],
    queryFn: async (): Promise<{ rows: ClinicRow[]; total: number }> => {
      if (isDemoModeEnabled()) {
        return {
          rows: [
            { id: '1', name: 'Mast Dental Moorooka', suburb: 'Moorooka', stage: 'active', credit_balance: 45, country: 'AU', is_active: true },
            { id: '2', name: 'Mast Dental Chermside', suburb: 'Chermside', stage: 'active', credit_balance: 12, country: 'AU', is_active: true },
            { id: '3', name: 'Mast Dental North Lakes', suburb: 'North Lakes', stage: 'active', credit_balance: 8, country: 'AU', is_active: true },
          ],
          total: 3,
        }
      }

      const { data, error } = await supabase.rpc('get_clinics_list', {
        p_stage: stage ?? undefined,
        p_page: page,
        p_page_size: PAGE_SIZE,
      })
      if (error) throw error
      const rows = (data ?? []) as unknown as (ClinicRow & { total_count?: number })[]
      return { rows, total: Number(rows[0]?.total_count ?? 0) }
    },
  })
}

export function useClinic(id: string | undefined) {
  return useQuery({
    queryKey: ['clinic', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<ClinicRow | null> => {
      if (isDemoModeEnabled()) {
        const demo = [
          { id: '1', name: 'Mast Dental Moorooka', suburb: 'Moorooka', stage: 'active', credit_balance: 45, country: 'AU', is_active: true },
          { id: '2', name: 'Mast Dental Chermside', suburb: 'Chermside', stage: 'active', credit_balance: 12, country: 'AU', is_active: true },
          { id: '3', name: 'Mast Dental North Lakes', suburb: 'North Lakes', stage: 'active', credit_balance: 8, country: 'AU', is_active: true },
        ]
        return demo.find((c) => c.id === id) ?? null
      }

      const { data, error } = await supabase
        .from('clinics')
        .select('id, name, suburb, stage, credit_balance, country, is_active')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data as ClinicRow | null
    },
  })
}

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: ['notifications', page],
    queryFn: async (): Promise<{ rows: NotificationRow[]; total: number }> => {
      if (isDemoModeEnabled()) {
        return {
          rows: [
            { id: '1', event_type: 'callback.due', title: 'Callback due', body: 'Maria Garcia — due now', is_read: false, created_at: new Date().toISOString() },
          ],
          total: 1,
        }
      }

      const { data, error } = await supabase.rpc('get_my_notifications', {
        p_page: page,
        p_page_size: PAGE_SIZE,
      })
      if (error) throw error
      const rows = (data ?? []) as unknown as (NotificationRow & { total_count?: number })[]
      return { rows, total: Number(rows[0]?.total_count ?? 0) }
    },
  })
}
