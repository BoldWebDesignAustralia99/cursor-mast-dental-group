export function enableDemoMode() {
  sessionStorage.setItem('demo_mode', 'true')
  window.location.href = '/dashboard'
}

export function isDemoModeEnabled() {
  return sessionStorage.getItem('demo_mode') === 'true'
}

export function disableDemoMode() {
  sessionStorage.removeItem('demo_mode')
}

export const isSupabaseConfigured =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY
