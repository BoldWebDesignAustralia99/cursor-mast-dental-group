import { PageHeader } from '@/components/shared/PageStates'
import { EmptyState } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'

export function PlaceholderPage({
  title,
  description,
  permission,
}: {
  title: string
  description: string
  permission?: string
}) {
  const content = (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <EmptyState
        title={`${title} — coming soon`}
        description="This module will be built in a later phase per the project roadmap."
      />
    </div>
  )

  if (permission) {
    return <PermissionGate permission={permission}>{content}</PermissionGate>
  }

  return content
}
