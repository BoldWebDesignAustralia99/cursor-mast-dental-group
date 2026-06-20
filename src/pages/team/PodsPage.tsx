import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useSalesPods, usePodMembers } from '@/hooks/useCopilot'

export function PodsPage() {
  const { data: pods, isLoading } = useSalesPods()
  const [selectedPodId, setSelectedPodId] = useState<string | undefined>()
  const activePodId = selectedPodId ?? pods?.[0]?.id
  const { data: members, isLoading: membersLoading } = usePodMembers(activePodId)

  return (
    <PermissionGate permission="team.manage">
      <div className="space-y-6">
        <PageHeader
          title="Sales pods"
          description="Pod isolation boundaries — reps only see leads assigned within their pod"
        />
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <Card className="border-border/40">
              <CardHeader><CardTitle className="text-sm">Pods</CardTitle></CardHeader>
              <CardContent className="space-y-1 p-2">
                {(pods ?? []).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPodId(p.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      activePodId === p.id ? 'bg-accent' : 'hover:bg-muted/50'
                    }`}
                  >
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.queue_type} · {p.region} · {p.member_count} members
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle className="text-base">Members</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border/40 p-0">
                {membersLoading ? (
                  <Skeleton className="m-4 h-24 w-full" />
                ) : (members ?? []).length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No members in this pod yet.</p>
                ) : (
                  (members ?? []).map((m) => (
                    <div key={m.staff_profile_id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-medium">{m.full_name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                      {m.is_manager && <Badge variant="secondary">Manager</Badge>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PermissionGate>
  )
}
