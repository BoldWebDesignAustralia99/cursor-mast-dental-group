import { PermissionGate } from '@/components/auth/PermissionGate'
import { PageHeader } from '@/components/shared/PageStates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useTrainingJourneys } from '@/hooks/useWorkflows'

export function TrainingPage() {
  const { data: journeys, isLoading } = useTrainingJourneys()

  return (
    <PermissionGate permission="training.view">
      <div className="space-y-6">
        <PageHeader title="Training" description="Your onboarding journey and skill development" />
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          (journeys ?? []).map((j: { journey_id: string; journey_name: string; total_stages: number; completed_stages: number }) => {
            const pct = j.total_stages ? Math.round((j.completed_stages / j.total_stages) * 100) : 0
            return (
              <Card key={j.journey_id} className="border-border/40">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{j.journey_name}</CardTitle>
                    <Badge variant="secondary">{pct}% complete</Badge>
                  </div>
                  <Progress value={pct} className="mt-3 h-1.5" />
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {j.completed_stages} of {j.total_stages} stages completed
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </PermissionGate>
  )
}
