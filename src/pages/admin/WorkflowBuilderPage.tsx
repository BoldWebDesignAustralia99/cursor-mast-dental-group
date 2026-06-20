import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkflows, useWorkflowSteps, useWorkflowRuns, useUpdateWorkflowStatus } from '@/hooks/useWorkflows'

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
          <Skeleton className="h-96 w-full" />
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
                    <TabsContent value="builder" className="mt-4 space-y-3">
                      {(steps ?? []).map((s) => (
                        <Card key={s.id} className="border-border/40">
                          <CardContent className="p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">{s.step_order}</span>
                              <Badge variant="secondary">{s.step_type}</Badge>
                            </div>
                            {s.template_body && (
                              <p className="rounded-lg bg-muted/30 p-3 text-sm">{s.template_body}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      <Card className="border-dashed border-border/40">
                        <CardContent className="p-4 text-center text-sm text-muted-foreground">
                          End of workflow
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="runs" className="mt-4 space-y-2">
                      {(runs ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No runs yet.</p>
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
