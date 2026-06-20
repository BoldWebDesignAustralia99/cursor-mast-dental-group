import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useTasksBoard() {
  return useQuery({
    queryKey: ['tasks-board'],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [{ id: '1', title: 'Review Raewyn booking', status: 'open', assignee_name: 'You', due_at: new Date().toISOString() }]
      }
      const { data, error } = await supabase.rpc('get_tasks_board')
      if (error) throw error
      return (data ?? []) as unknown as { id: string; title: string; status: string; assignee_name: string | null }[]
    },
  })
}

export function useTimesheets() {
  return useQuery({
    queryKey: ['timesheets'],
    queryFn: async () => {
      if (isDemoModeEnabled()) return [] as { id: string; staff_name: string; clock_in: string; status: string }[]
      const { data, error } = await db.rpc('get_timesheets_recent')
      if (error) throw error
      return (data ?? []) as unknown as { id: string; staff_name: string; clock_in: string; status: string }[]
    },
  })
}

export function useLeaveRequests() {
  return useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      if (isDemoModeEnabled()) return [] as { id: string; staff_name: string; leave_type: string; status: string }[]
      const { data, error } = await db.rpc('get_leave_requests_list')
      if (error) throw error
      return (data ?? []) as unknown as { id: string; staff_name: string; leave_type: string; status: string }[]
    },
  })
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [{ staff_id: '1', full_name: 'Demo Rep', bookings_month: 12, shows_month: 8, avg_grade: 85 }]
      }
      const { data, error } = await supabase.rpc('get_rep_leaderboard')
      if (error) throw error
      return (data ?? []) as unknown as { staff_id: string; full_name: string; bookings_month: number; shows_month: number; avg_grade: number | null }[]
    },
  })
}

export function useCommunityPosts() {
  return useQuery({
    queryKey: ['community-posts'],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [{ id: '1', body: 'Great week team — 15 bookings!', author_name: 'Manager', created_at: new Date().toISOString() }]
      }
      const { data, error } = await db
        .from('community_posts')
        .select('id, body, created_at, staff_profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return ((data ?? []) as { id: string; body: string; created_at: string; staff_profiles: { full_name: string } | null }[]).map((p) => ({
        id: p.id,
        body: p.body,
        created_at: p.created_at,
        author_name: p.staff_profiles?.full_name ?? 'Staff',
      }))
    },
  })
}
