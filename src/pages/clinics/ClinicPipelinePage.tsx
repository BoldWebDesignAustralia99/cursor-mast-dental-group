import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useClinicsList } from '@/hooks/useDashboard'

const STAGE_ORDER = ['lead', 'in_pipeline', 'proposal_sent', 'signed', 'onboarding', 'active', 'paused', 'churned']

export function ClinicPipelinePage() {
  const { data } = useClinicsList(null, 1)
  const clinics = data?.rows ?? []

  const byStage = STAGE_ORDER.map((stage) => ({
    stage,
    items: clinics.filter((c) => c.stage === stage),
  }))

  return (
    <PermissionGate permission="clinics.view">
      <div className="space-y-6">
        <PageHeader title="Clinic pipeline" description="Kanban view by lifecycle stage" />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {byStage.map(({ stage, items }) => (
            <div key={stage} className="w-72 shrink-0">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium capitalize">{stage.replace(/_/g, ' ')}</h3>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {items.map((c) => (
                  <Link key={c.id} to={`/clinics/${c.id}`}>
                    <Card className="border-border/40 transition-colors hover:bg-accent/30">
                      <CardContent className="p-3">
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.suburb}</p>
                        <p className="mt-1 text-xs tabular-nums">{c.credit_balance} credits</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PermissionGate>
  )
}
