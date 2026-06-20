import { useState } from 'react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { PageHeader, EmptyState } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCallGradesQueue } from '@/hooks/useCopilot'
import { useTrainingJourneys } from '@/hooks/useWorkflows'
import { useTrainingStages, useCreateTrainingStage, useResolveCallGrade } from '@/hooks/useSpecFeatures'

const STAGE_TYPES = ['course', 'quiz', 'script_drill', 'ai_practice_call', 'call_review']

export function TrainingBuilderPage() {
  const { data: journeys } = useTrainingJourneys()
  const journeyId = journeys?.[0]?.journey_id
  const { data: stages, isLoading } = useTrainingStages(journeyId)
  const createStage = useCreateTrainingStage()
  const [stageName, setStageName] = useState('')
  const [stageType, setStageType] = useState('course')

  const handleSave = async () => {
    if (!journeyId || !stageName.trim()) return
    await createStage.mutateAsync({ journeyId, name: stageName, stageType })
    setStageName('')
    toast.success('Stage saved')
  }

  return (
    <PermissionGate permission="training.manage">
      <div className="space-y-6">
        <PageHeader title="Journey builder" description="Create training pipelines with ordered stages" actions={<Button asChild variant="outline"><Link to="/training">View progress</Link></Button>} />
        <Card className="border-border/40">
          <CardHeader><CardTitle className="text-base">{journeys?.[0]?.journey_name ?? 'Sales onboarding'}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? <Skeleton className="h-24" /> : (stages ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                <div><p className="text-sm font-medium">{s.name}</p><p className="text-xs capitalize text-muted-foreground">{s.stage_type.replace(/_/g, ' ')}</p></div>
                <Badge variant="secondary">{s.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader><CardTitle className="text-base">New stage</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Stage name" value={stageName} onChange={(e) => setStageName(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {STAGE_TYPES.map((t) => (
                <Badge key={t} variant={stageType === t ? 'default' : 'outline'} className="cursor-pointer capitalize" onClick={() => setStageType(t)}>{t.replace(/_/g, ' ')}</Badge>
              ))}
            </div>
            <Button disabled={!stageName.trim() || createStage.isPending} onClick={() => void handleSave()}>Save stage</Button>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}

export function GradingReviewPage() {
  const { data: grades, isLoading } = useCallGradesQueue()
  const resolve = useResolveCallGrade()

  const handleApprove = (id: string) => void resolve.mutateAsync({ id, decision: 'approved' }).then(() => toast.success('Grade approved'))
  const handleAdjust = (id: string) => void resolve.mutateAsync({ id, decision: 'adjusted', newScore: 85 }).then(() => toast.success('Score adjusted'))

  return (
    <PermissionGate permission="team.manage">
      <div className="space-y-6">
        <PageHeader title="Grading review queue" description="Disputed and flagged call grades" />
        {isLoading ? <Skeleton className="h-32 w-full rounded-xl" /> : (
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
                    <Button size="sm" disabled={resolve.isPending} onClick={() => handleApprove(g.id)}>Approve grade</Button>
                    <Button size="sm" variant="outline" disabled={resolve.isPending} onClick={() => handleAdjust(g.id)}>Adjust to 85</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(grades ?? []).length === 0 && <EmptyState title="Queue is clear" description="No disputed or flagged call grades need review." />}
          </div>
        )}
      </div>
    </PermissionGate>
  )
}