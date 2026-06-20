import { Play, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { PageHeader } from '@/components/shared/PageStates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ROLE_LABELS } from '@/lib/constants'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { useDashboardStats } from '@/hooks/useDashboard'
import { useStartWork } from '@/hooks/useStartWork'

export function DashboardPage() {
  const { profile } = useAuth()
  const { data: stats, isLoading } = useDashboardStats()
  const startWork = useStartWork()
  const startReactivation = useStartWork()

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

        {/* Start Work — the revenue lever */}
        <PermissionGate permission="calls.make">
          <Card className="border-accent-emerald/20 bg-gradient-to-br from-accent-emerald/5 to-transparent">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Zap className="size-4 text-accent-emerald" />
                  <span className="text-sm font-medium text-accent-emerald">Ready to sell</span>
                </div>
                <h2 className="text-xl font-semibold tracking-tight">Start Work</h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  The allocation engine serves your next lead — callbacks first, then new, then follow-ups.
                  No queue browsing.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <Button
                  size="lg"
                  className="h-12 gap-2 bg-accent-emerald px-8 text-accent-emerald-foreground hover:bg-accent-emerald/90"
                  disabled={startWork.isPending}
                  onClick={() => startWork.mutate('frontline')}
                >
                  <Play className="size-4 fill-current" />
                  {startWork.isPending ? 'Allocating…' : 'Start Work'}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-border/60"
                  disabled={startReactivation.isPending}
                  onClick={() => startReactivation.mutate('reactivation')}
                >
                  Reactivation queue
                </Button>
              </div>
            </CardContent>
          </Card>
        </PermissionGate>

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
                { label: 'Today\'s bookings', href: '/bookings' },
                { label: 'Clinic CRM', href: '/clinics' },
                { label: 'Training', href: '/training' },
                { label: 'Team & HR', href: '/team' },
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
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
