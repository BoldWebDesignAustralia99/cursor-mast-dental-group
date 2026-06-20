import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export type TaskRow = {
  id: string
  title: string
  description: string | null
  status: string
  assigned_to: string | null
  assignee_name: string | null
  due_at: string | null
  created_at: string
}

const DEMO_TASKS: TaskRow[] = [
  {
    id: '1',
    title: 'Review callback queue',
    description: 'Check overdue callbacks and assign follow-ups',
    status: 'open',
    assigned_to: 'demo-profile-id',
    assignee_name: 'You',
    due_at: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Update clinic routing matrix',
    description: null,
    status: 'open',
    assigned_to: 'demo-profile-id',
    assignee_name: 'You',
    due_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
]

export function useTasksBoard() {
  return useQuery({
    queryKey: ['tasks-board'],
    queryFn: async () => {
      if (isDemoModeEnabled()) return DEMO_TASKS
      const { data, error } = await supabase.rpc('get_tasks_board')
      if (error) throw error
      return (data ?? []) as TaskRow[]
    },
  })
}

export function useStaffProfiles() {
  return useQuery({
    queryKey: ['staff-profiles'],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [{ id: 'demo-profile-id', full_name: 'Demo Admin', email: 'demo@mastdental.com' }]
      }
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name')
      if (error) throw error
      return data as { id: string; full_name: string; email: string }[]
    },
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      title: string
      description?: string
      assigned_to?: string
      due_at?: string
    }) => {
      if (isDemoModeEnabled()) return

      const { data: profile, error: profileError } = await supabase.rpc('get_my_profile')
      if (profileError) throw profileError
      const staffId = (profile as { id: string }).id

      const { error } = await db.from('tasks').insert({
        title: input.title,
        description: input.description ?? null,
        assigned_to: input.assigned_to ?? staffId,
        assigned_by: staffId,
        due_at: input.due_at ?? null,
        status: 'open',
      })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks-board'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (isDemoModeEnabled()) return
      const { error } = await db.from('tasks').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks-board'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
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
        .select('id, body, created_at, author:staff_profiles!community_posts_author_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return ((data ?? []) as { id: string; body: string; created_at: string; author: { full_name: string } | null }[]).map((p) => ({
        id: p.id,
        body: p.body,
        created_at: p.created_at,
        author_name: p.author?.full_name ?? 'Staff',
      }))
    },
  })
}
