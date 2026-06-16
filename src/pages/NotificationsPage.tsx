import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { useNotifications } from '@/hooks/useDashboard'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export function NotificationsPage() {
  const { data, isLoading } = useNotifications()

  return (
    <PermissionGate permission="notifications.view">
      <div className="space-y-6">
        <PageHeader
          title="Notifications"
          description="Your activity feed, grouped by day"
        />

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : data?.rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/40 p-12 text-center text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <div className="divide-y divide-border/40 rounded-xl border border-border/40">
            {data?.rows.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-4 p-4',
                  !n.is_read && 'bg-accent/20',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    {!n.is_read && <Badge variant="info">New</Badge>}
                  </div>
                  {n.body && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(n.created_at), 'd MMM yyyy, h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PermissionGate>
  )
}
