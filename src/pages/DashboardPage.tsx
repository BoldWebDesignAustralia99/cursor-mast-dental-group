import { useAuth } from '@/providers/AuthProvider'
import { PageHeader } from '@/components/shared/PageStates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ROLE_LABELS } from '@/lib/constants'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { useDashboardStats } from '@/hooks/useDashboard'
import { Link } from 'react-router-dom'

export function DashboardPage() {
  const { profile } = useAuth()
  const { data: stats, isLoading } = useDashboardStats()

  const cards = [
    { label: 'Callbacks due', value: stats?.callbacks_due, href: '/calls/queue', status: 'warning' as const },
    { label: 'Bookings today', value: stats?.bookings_today, href: '/bookings', status: 'info' as const },
    { label: 'Shows this week', value: stats?.shows_this_week, href: '/bookings', status: 'success' as const },
    { label: 'Open leads', value: stats?.open_leads, href: '/leads', status: 'info' as const },
  ]

  return (
    <PermissionGate permission="dashboard.view">
      <div className="space-y-8">
        <PageHeader
          title={`Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${profile?.full_name?.split(' ')[0] ?? 'there'}`}
          description={`${profile ? ROLE_LABELS[profile.role] : ''} · ${formatDate()}`}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((stat) => (
            <Link key={stat.label} to={stat.href}>
              <Card className="border-border/40 transition-colors hover:bg-accent/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-9 w-16" />
                  ) : (
                    <p className="text-3xl font-semibold tabular-nums tracking-tight">
                      {stat.value ?? '—'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {[
                { label: 'Open call queue', href: '/calls/queue' },
                { label: 'View leads', href: '/leads' },
                { label: 'Today\'s bookings', href: '/bookings' },
                { label: 'Clinic CRM', href: '/clinics' },
              ].map((action) => (
                <Link
                  key={action.href}
                  to={action.href}
                  className="rounded-lg border border-border/40 px-4 py-3 text-sm font-medium transition-colors hover:bg-accent/50"
                >
                  {action.label}
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="text-base">Open tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-semibold tabular-nums">{stats?.open_tasks ?? 0}</span>
                  <Badge variant="secondary">Team & HR</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGate>
  )
}

function formatDate() {
  return new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
