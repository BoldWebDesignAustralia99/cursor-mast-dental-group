import { useMemo } from 'react'
import { PageHeader, EmptyState } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { useNotifications, type NotificationRow } from '@/hooks/useDashboard'
import { useMarkNotificationsRead } from '@/hooks/usePortal'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format, isToday, isYesterday } from 'date-fns'
import { cn } from '@/lib/utils'

function dayLabel(date: Date) {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, d MMMM')
}

export function NotificationsPage() {
  const { data, isLoading } = useNotifications()
  const markRead = useMarkNotificationsRead()
  const unreadIds = data?.rows.filter((n) => !n.is_read).map((n) => n.id) ?? []

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationRow[]>()
    for (const n of data?.rows ?? []) {
      const key = format(new Date(n.created_at), 'yyyy-MM-dd')
      const list = map.get(key) ?? []
      list.push(n)
      map.set(key, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [data?.rows])

  return (
    <PermissionGate permission="notifications.view">
      <div className="space-y-6">
        <PageHeader
          title="Notifications"
          description="Your activity feed, grouped by day"
          actions={
            unreadIds.length > 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void markRead.mutateAsync(unreadIds)}
              >
                Mark all read
              </Button>
            ) : undefined
          }
        />

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : (data?.rows.length ?? 0) === 0 ? (
          <EmptyState
            title="All caught up"
            description="Notifications about bookings, leads, and team activity will appear here."
          />
        ) : (
          <div className="space-y-6">
            {grouped.map(([dateKey, items]) => (
              <section key={dateKey}>
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {dayLabel(new Date(dateKey))}
                </h2>
                <div className="divide-y divide-border/40 rounded-xl border border-border/40">
                  {items.map((n) => (
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
                          {format(new Date(n.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </PermissionGate>
  )
}
