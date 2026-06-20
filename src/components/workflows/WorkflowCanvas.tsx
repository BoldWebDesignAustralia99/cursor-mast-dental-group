import { ArrowDown, Mail, MessageSquare, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface WorkflowCanvasStep {
  id: string
  step_order: number
  step_type: string
  template_body?: string | null
}

interface WorkflowCanvasProps {
  triggerType: string
  steps: WorkflowCanvasStep[]
  status: string
}

const STEP_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  wait: ArrowDown,
  condition: Zap,
}

export function WorkflowCanvas({ triggerType, steps, status }: WorkflowCanvasProps) {
  return (
    <div className="relative rounded-xl border border-border/40 bg-muted/20 p-6">
      <div className="flex flex-col items-center gap-0">
        <Card className="w-full max-w-sm border-accent-emerald/30 bg-background shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-8 items-center justify-center rounded-full bg-accent-emerald/15 text-accent-emerald">
              <Zap className="size-4" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Trigger</p>
              <p className="text-sm font-medium">{triggerType.replace(/_/g, ' ')}</p>
            </div>
            <Badge variant={status === 'active' ? 'success' : 'secondary'} className="ml-auto">
              {status}
            </Badge>
          </CardContent>
        </Card>

        {steps.map((step, i) => {
          const Icon = STEP_ICONS[step.step_type] ?? MessageSquare
          return (
            <div key={step.id} className="flex w-full max-w-sm flex-col items-center">
              <div className="my-1 h-6 w-px bg-border" />
              <Card className={cn('w-full border-border/40 bg-background shadow-sm', i === 0 && 'ring-1 ring-border')}>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {step.step_order}
                    </span>
                    <Icon className="size-3.5 text-muted-foreground" />
                    <Badge variant="secondary">{step.step_type}</Badge>
                  </div>
                  {step.template_body && (
                    <p className="rounded-lg bg-muted/30 p-3 text-sm leading-relaxed">{step.template_body}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        })}

        {steps.length > 0 && (
          <>
            <div className="my-1 h-6 w-px bg-border" />
            <p className="text-xs text-muted-foreground">End</p>
          </>
        )}
      </div>
    </div>
  )
}
