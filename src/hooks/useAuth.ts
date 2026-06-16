import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled, disableDemoMode } from '@/lib/demo'
import type { StaffProfile } from '@/types/database'

const DEMO_PROFILE: StaffProfile = {
  id: 'demo-profile-id',
  user_id: 'demo-user-id',
  email: 'demo@mastdental.com',
  full_name: 'Demo Admin',
  role: 'super_admin',
  phone: null,
  avatar_url: null,
  theme_preference: 'system',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export function useAuthProfile() {
  return useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: async (): Promise<StaffProfile | null> => {
      if (isDemoModeEnabled()) return DEMO_PROFILE

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return null

      const { data, error } = await supabase.rpc('get_my_profile')
      if (error) throw error
      return data as StaffProfile
    },
    staleTime: 60_000,
  })
}

export function useUpdateThemePreference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (theme: StaffProfile['theme_preference']) => {
      if (isDemoModeEnabled()) return theme

      const profile = queryClient.getQueryData<StaffProfile>(['auth', 'profile'])
      if (!profile) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('staff_profiles')
        .update({ theme_preference: theme })
        .eq('id', profile.id)

      if (error) throw error
      return theme
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] })
    },
  })
}

export async function signInWithMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
}

export async function signOut() {
  disableDemoMode()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
