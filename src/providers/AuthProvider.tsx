import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthProfile } from '@/hooks/useAuth'
import {
  isDemoModeEnabled,
  isSupabaseConfigured,
} from '@/lib/demo'
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

interface AuthContextValue {
  profile: StaffProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  sessionReady: boolean
  isDemoMode: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: profile, isLoading, refetch } = useAuthProfile()
  const [sessionReady, setSessionReady] = useState(!isSupabaseConfigured)
  const [demoMode] = useState(
    () => !isSupabaseConfigured && isDemoModeEnabled(),
  )

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refetch()
      setSessionReady(true)
    })

    void supabase.auth.getSession().then(() => setSessionReady(true))

    return () => subscription.unsubscribe()
  }, [refetch])

  const value = useMemo(() => {
    const effectiveProfile = demoMode ? DEMO_PROFILE : (profile ?? null)
    return {
      profile: effectiveProfile,
      isLoading: isSupabaseConfigured ? isLoading : false,
      isAuthenticated: demoMode || !!profile,
      sessionReady: isSupabaseConfigured ? sessionReady : true,
      isDemoMode: demoMode,
    }
  }, [profile, isLoading, sessionReady, demoMode])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
