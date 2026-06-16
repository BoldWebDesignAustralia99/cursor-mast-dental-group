import { PageHeader, EmptyState } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'

export function NotificationsPage() {
  return (
    <PermissionGate permission="notifications.view">
      <div className="space-y-6">
        <PageHeader
          title="Notifications"
          description="Your activity feed grouped by day"
        />
        <EmptyState
          title="No notifications yet"
          description="When events happen that concern you — new leads, callbacks, approvals — they'll appear here in real time."
        />
      </div>
    </PermissionGate>
  )
}
