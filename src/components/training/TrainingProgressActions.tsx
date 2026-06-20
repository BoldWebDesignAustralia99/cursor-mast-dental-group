import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useTrainingStages, useCompleteTrainingStage } from '@/hooks/useSpecFeatures'

export function TrainingProgressActions({ journeyId }: { journeyId: string }) {
  const { data: stages } = useTrainingStages(journeyId)
  const complete = useCompleteTrainingStage()
  const next = (stages ?? []).find((s) => s.status !== 'completed')
  if (!next) return null
  return (
    <Button size="sm" disabled={complete.isPending} onClick={() => void complete.mutateAsync(next.id).then(() => toast.success('Stage completed'))}>
      Complete next stage
    </Button>
  )
}
