import { format } from 'date-fns'
import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCoachingSessions } from '@/hooks/useCopilot'

export function CoachingPage() {
  const { data: sessions, isLoading } = useCoachingSessions()

  return (
    <PermissionGate permission="team.view">
      <div className="space-y-6">
        <PageHeader
          title="Coaching"
          description="AI-generated daily coaching summaries from recent calls"
        />
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-3">
            {(sessions ?? []).map((s) => (
              <Card key={s.id} className="border-border/40">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">{s.full_name}</p>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(s.created_at), 'd MMM yyyy')}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.summary}</p>
                </CardContent>
              </Card>
            ))}
            {(sessions ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                No coaching sessions yet. The daily `process-coaching` job generates these from call transcripts.
              </p>
            )}
          </div>
        )}
      </div>
    </PermissionGate>
  )
}
