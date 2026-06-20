import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'
import type { TranscriptLine } from '@/hooks/useLiveTranscript'

export interface CopilotCue {
  id: string
  title: string
  content: string
  sort_order: number
}

const DEMO_CUES: CopilotCue[] = [
  { id: '1', title: 'Superannuation objection', content: 'Many patients use super for implants — I can explain the process.', sort_order: 1 },
  { id: '2', title: 'Pain concern', content: 'Sedation options available — most patients report minimal discomfort.', sort_order: 2 },
]

function extractKeywords(lines: TranscriptLine[]): string[] {
  const text = lines.map((l) => l.text.toLowerCase()).join(' ')
  const tokens = text.split(/\W+/).filter((w) => w.length > 3)
  return [...new Set(tokens)].slice(0, 20)
}

export function useCopilotCues(lines: TranscriptLine[]) {
  const keywords = useMemo(() => extractKeywords(lines), [lines])

  return useQuery({
    queryKey: ['copilot-cues', keywords.join(',')],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        if (keywords.some((k) => k.includes('super') || k.includes('husband'))) {
          return DEMO_CUES
        }
        return DEMO_CUES.slice(0, 1)
      }
      const { data, error } = await (supabase as any).rpc('get_copilot_cue_cards', {
        p_keywords: keywords,
      })
      if (error) throw error
      return (data ?? []) as CopilotCue[]
    },
    staleTime: 10_000,
  })
}

export function useCoachingSessions(staffId?: string) {
  return useQuery({
    queryKey: ['coaching-sessions', staffId],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [{
          id: '1',
          staff_id: 'demo',
          full_name: 'Demo Rep',
          summary: 'Strong discovery on the last call. Work on asking about decision-maker earlier.',
          checklist: [],
          created_at: new Date().toISOString(),
        }]
      }
      const { data, error } = await (supabase as any).rpc('get_coaching_sessions', {
        p_staff_id: staffId ?? null,
      })
      if (error) throw error
      return data as { id: string; staff_id: string; full_name: string; summary: string; checklist: unknown; created_at: string }[]
    },
  })
}

export function useCallGradesQueue() {
  return useQuery({
    queryKey: ['call-grades-queue'],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [{
          id: '1',
          staff_name: 'Demo Rep',
          score: 72,
          feedback: 'Good empathy; discovery could go deeper.',
          status: 'disputed',
          created_at: new Date().toISOString(),
        }]
      }
      const { data, error } = await (supabase as any).rpc('get_call_grades_queue')
      if (error) throw error
      return data as { id: string; staff_name: string; score: number; feedback: string; status: string; created_at: string }[]
    },
  })
}

export function useSalesPods() {
  return useQuery({
    queryKey: ['sales-pods'],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [{ id: '1', name: 'Frontline Sales — US East', queue_type: 'frontline', region: 'US', member_count: 3, is_active: true }]
      }
      const { data, error } = await (supabase as any).rpc('get_sales_pods')
      if (error) throw error
      return data as { id: string; name: string; queue_type: string; region: string; member_count: number; is_active: boolean }[]
    },
  })
}

export function usePodMembers(podId?: string) {
  return useQuery({
    queryKey: ['pod-members', podId],
    enabled: Boolean(podId),
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return [{ staff_profile_id: '1', full_name: 'Demo Rep', email: 'rep@mastdental.com', is_manager: false }]
      }
      const { data, error } = await (supabase as any).rpc('get_pod_members', { p_pod_id: podId })
      if (error) throw error
      return data as { staff_profile_id: string; full_name: string; email: string; is_manager: boolean }[]
    },
  })
}
