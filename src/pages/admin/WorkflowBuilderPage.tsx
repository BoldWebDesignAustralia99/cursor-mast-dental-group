import { useState } from 'react'
import { PageHeader, EmptyState } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkflows, useWorkflowSteps, useWorkflowRuns, useUpdateWorkflowStatus } from '@/hooks/useWorkflows'
import { WorkflowCanvas } from '@/components/workflows/WorkflowCanvas'

export function WorkflowBuilderPage() {
  const { data: workflows, isLoading } = useWorkflows()
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const activeId = selectedId ?? workflows?.[0]?.id
  const { data: steps } = useWorkflowSteps(activeId)
  const { data: runs } = useWorkflowRuns(activeId)
  const updateStatus = useUpdateWorkflowStatus()

  return (
    <PermissionGate permission="workflows.view">
      <div className="space-y-6">
        <PageHeader
          title="Workflow builder"
          description="Trigger → conditions → steps. All outbound comms run through here."
        />
        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : (workflows ?? []).length === 0 ? (
          <EmptyState
            title="No workflows yet"
            description="Automations route all outbound SMS, email, and reminders. Seed workflows via migrations or create one here."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <Card className="border-border/40">
              <CardHeader><CardTitle className="text-sm">Workflows</CardTitle></CardHeader>
              <CardContent className="space-y-1 p-2">
                {(workflows ?? []).map((w) => (
                  <Button
                    key={w.id}
                    variant={activeId === w.id ? 'secondary' : 'ghost'}
                    className="h-auto w-full justify-start px-3 py-2 text-left font-normal"
                    onClick={() => setSelectedId(w.id)}
                  >
                    <div>
                      <p className="text-sm font-medium">{w.name}</p>
                      <p className="text-xs text-muted-foreground">{w.trigger_type}</p>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              {activeId && workflows?.find((w) => w.id === activeId) && (
                <>
                  <Card className="border-border/40">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{workflows.find((w) => w.id === activeId)?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          WHEN {workflows.find((w) => w.id === activeId)?.trigger_type}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={workflows.find((w) => w.id === activeId)?.status === 'active' ? 'success' : 'secondary'}>
                          {workflows.find((w) => w.id === activeId)?.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void updateStatus.mutateAsync({
                            id: activeId,
                            status: workflows.find((w) => w.id === activeId)?.status === 'active' ? 'draft' : 'active',
                          })}
                        >
                          Toggle active
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Tabs defaultValue="builder">
                    <TabsList>
                      <TabsTrigger value="builder">Builder</TabsTrigger>
                      <TabsTrigger value="runs">Runs</TabsTrigger>
                    </TabsList>
                    <TabsContent value="builder" className="mt-4">
                      {workflows?.find((w) => w.id === activeId) && (
                        <WorkflowCanvas
                          triggerType={workflows.find((w) => w.id === activeId)!.trigger_type}
                          steps={(steps ?? []).map((s) => ({
                            id: s.id,
                            step_order: s.step_order,
                            step_type: s.step_type,
                            template_body: s.template_body,
                          }))}
                          status={workflows.find((w) => w.id === activeId)!.status}
                        />
                      )}
                      {(steps ?? []).length === 0 && (
                        <EmptyState title="No steps configured" description="Add trigger actions like send SMS or wait delay." className="mt-4 py-6" />
                      )}
                    </TabsContent>
                    <TabsContent value="runs" className="mt-4 space-y-2">
                      {(runs ?? []).length === 0 ? (
                        <EmptyState title="No runs yet" description="Workflow runs appear here once triggers fire." className="py-6" />
                      ) : (
                        (runs ?? []).map((r: { id: string; status: string; started_at: string }) => (
                          <div key={r.id} className="flex justify-between rounded-lg border border-border/40 p-3 text-sm">
                            <span>{r.status}</span>
                            <span className="text-muted-foreground">{new Date(r.started_at).toLocaleString()}</span>
                          </div>
                        ))
                      )}
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  )
}
