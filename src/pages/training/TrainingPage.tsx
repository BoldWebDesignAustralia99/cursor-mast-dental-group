import { PermissionGate } from '@/components/auth/PermissionGate'
import { PageHeader } from '@/components/shared/PageStates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const DEMO_STAGES = [
  { name: 'Product knowledge', type: 'course', status: 'completed' },
  { name: 'Discovery call script', type: 'script_drill', status: 'completed' },
  { name: 'Objection handling quiz', type: 'quiz', status: 'in_progress' },
  { name: 'Practice call — booking', type: 'ai_practice_call', status: 'locked' },
  { name: 'Live call review', type: 'call_review', status: 'locked' },
]

export function TrainingPage() {
  return (
    <PermissionGate permission="training.view">
      <div className="space-y-6">
        <PageHeader
          title="Training"
          description="Your onboarding journey and skill development"
        />

        <Card className="border-border/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sales onboarding</CardTitle>
              <Badge variant="secondary">40% complete</Badge>
            </div>
            <Progress value={40} className="mt-3 h-1.5" />
          </CardHeader>
          <CardContent className="space-y-2">
            {DEMO_STAGES.map((stage, i) => (
              <div
                key={stage.name}
                className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{stage.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{stage.type.replace('_', ' ')}</p>
                  </div>
                </div>
                <Badge
                  variant={
                    stage.status === 'completed' ? 'success'
                      : stage.status === 'in_progress' ? 'info'
                        : 'secondary'
                  }
                >
                  {stage.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}
