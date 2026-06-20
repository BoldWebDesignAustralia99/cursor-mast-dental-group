import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCallGradesQueue } from '@/hooks/useCopilot'

const STAGE_TYPES = ['course', 'quiz', 'script_drill', 'ai_practice_call', 'call_review']

export function TrainingBuilderPage() {
  return (
    <PermissionGate permission="training.manage">
      <div className="space-y-6">
        <PageHeader
          title="Journey builder"
          description="Create training pipelines with ordered stages"
          actions={<Button>Add stage</Button>}
        />
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-base">Sales onboarding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {STAGE_TYPES.map((type, i) => (
              <div key={type} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                <div>
                  <p className="text-sm font-medium">Stage {i + 1}</p>
                  <p className="text-xs capitalize text-muted-foreground">{type.replace(/_/g, ' ')}</p>
                </div>
                <Badge variant="secondary">{type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader><CardTitle className="text-base">New stage</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Stage name" />
            <div className="flex flex-wrap gap-2">
              {STAGE_TYPES.map((t) => (
                <Badge key={t} variant="outline" className="cursor-pointer capitalize">{t.replace(/_/g, ' ')}</Badge>
              ))}
            </div>
            <Button>Save stage</Button>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}

export function GradingReviewPage() {
  const { data: grades, isLoading } = useCallGradesQueue()

  return (
    <PermissionGate permission="team.manage">
      <div className="space-y-6">
        <PageHeader title="Grading review queue" description="Disputed and flagged call grades" />
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-2">
            {(grades ?? []).map((g) => (
              <Card key={g.id} className="border-border/40">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium text-sm">{g.staff_name}</p>
                    <Badge variant={g.status === 'disputed' ? 'error' : 'secondary'}>{g.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Score: {g.score ?? '—'}</p>
                  {g.feedback && <p className="mt-2 text-sm">{g.feedback}</p>}
                  <div className="mt-3 flex gap-2">
                    <Button size="sm">Approve grade</Button>
                    <Button size="sm" variant="outline">Adjust score</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(grades ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No grades pending review.</p>
            )}
          </div>
        )}
      </div>
    </PermissionGate>
  )
}
