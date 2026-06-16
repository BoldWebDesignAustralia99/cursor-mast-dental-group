import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermissions'
import { ErrorState } from '@/components/shared/PageStates'
import { Skeleton } from '@/components/ui/skeleton'

interface PermissionGateProps {
  permission: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGate({
  permission,
  children,
  fallback,
}: PermissionGateProps) {
  const { allowed, isLoading } = usePermission(permission)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!allowed) {
    return (
      fallback ?? (
        <ErrorState
          title="Access denied"
          message="You don't have permission to view this page. Contact your manager if you need access."
        />
      )
    )
  }

  return <>{children}</>
}

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL

  if (!hasSupabase) {
    return <>{children}</>
  }

  // Auth check handled by parent route loader pattern via useAuth in AppShell
  return <>{children}</>
}

export function RequirePermission({
  permission,
  children,
}: {
  permission: string
  children: ReactNode
}) {
  const { allowed, isLoading } = usePermission(permission)

  if (isLoading) return null
  if (!allowed) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
