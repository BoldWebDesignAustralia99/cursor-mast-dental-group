import { useAuth } from '@/providers/AuthProvider'
import { PageHeader } from '@/components/shared/PageStates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/lib/constants'
import { PermissionGate } from '@/components/auth/PermissionGate'

export function DashboardPage() {
  const { profile } = useAuth()

  return (
    <PermissionGate permission="dashboard.view">
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Overview of your work today. Detailed metrics arrive in later phases."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Callbacks due', value: '—', status: 'warning' as const },
            { label: 'Bookings today', value: '—', status: 'info' as const },
            { label: 'Shows this week', value: '—', status: 'success' as const },
            { label: 'Open tasks', value: '—', status: 'info' as const },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{stat.value}</p>
                <Badge variant={stat.status} className="mt-2">
                  Coming in phase 2+
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome, {profile?.full_name ?? 'there'}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              You are signed in as{' '}
              <strong>{profile ? ROLE_LABELS[profile.role] : 'unknown role'}</strong>.
              Phase 1 foundation is live: auth, permissions, settings, and the app shell.
            </p>
            <p className="mt-2">
              Use the sidebar or press <kbd className="rounded border px-1">⌘K</kbd> to
              navigate. Toggle light/dark mode from the top bar.
            </p>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}
