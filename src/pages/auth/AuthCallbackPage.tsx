import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      navigate(session ? '/dashboard' : '/login', { replace: true })
    })
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <Skeleton className="mx-auto h-8 w-48" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  )
}
