import { useState } from 'react'
import { PageHeader, EmptyState } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useWorkflows, useWorkflowSteps, useWorkflowRuns, useUpdateWorkflowStatus } from '@/hooks/useWorkflows'
import { useCreateWorkflow, useAddWorkflowStep } from '@/hooks/useSpecFeatures'
import { WorkflowCanvas } from '@/components/workflows/WorkflowCanvas'
import { toast } from 'sonner'

const TRIGGERS = ['booking_created', 'credit_low', 'no_show_recorded', 'lead_created']
const STEP_TYPES = ['sms', 'email', 'wait', 'notification']

export function WorkflowBuilderPage() {
  const { data: workflows, isLoading } = useWorkflows()
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const activeId = selectedId ?? workflows?.[0]?.id
  const { data: steps } = useWorkflowSteps(activeId)
  const { data: runs } = useWorkflowRuns(activeId)
  const updateStatus = useUpdateWorkflowStatus()
  const createWorkflow = useCreateWorkflow()
  const addStep = useAddWorkflowStep()

  const [createOpen, setCreateOpen] = useState(false)
  const [wfName, setWfName] = useState('')
  const [wfTrigger, setWfTrigger] = useState('booking_created')
  const [stepType, setStepType] = useState('sms')
  const [stepBody, setStepBody] = useState('')

  const handleCreate = async () => {
    if (!wfName.trim()) return
    const id = await createWorkflow.mutateAsync({ name: wfName, triggerType: wfTrigger })
    setCreateOpen(false)
    setWfName('')
    if (id) setSelectedId(id)
    toast.success('Workflow created')
  }

  const handleAddStep = async () => {
    if (!activeId) return
    await addStep.mutateAsync({ automationId: activeId, stepType, templateBody: stepBody || undefined })
    setStepBody('')
    toast.success('Step added')
  }

  return (
    <PermissionGate permission="workflows.view">
      <div className="space-y-6">
        <PageHeader
          title="Workflow builder"
          description="Trigger → conditions → steps. All outbound comms run through here."
          actions={<Button onClick={() => setCreateOpen(true)}>New workflow</Button>}
        />
        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : (workflows ?? []).length === 0 ? (
          <EmptyState title="No workflows yet" description="Create your first automation workflow." actionLabel="New workflow" onAction={() => setCreateOpen(true)} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <Card className="border-border/40">
              <CardHeader><CardTitle className="text-sm">Workflows</CardTitle></CardHeader>
              <CardContent className="space-y-1 p-2">
                {(workflows ?? []).map((w) => (
                  <Button key={w.id} variant={activeId === w.id ? 'secondary' : 'ghost'} className="h-auto w-full justify-start px-3 py-2 text-left font-normal" onClick={() => setSelectedId(w.id)}>
                    <div><p className="text-sm font-medium">{w.name}</p><p className="text-xs text-muted-foreground">{w.trigger_type}</p></div>
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
                        <p className="text-xs text-muted-foreground">WHEN {workflows.find((w) => w.id === activeId)?.trigger_type}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={workflows.find((w) => w.id === activeId)?.status === 'active' ? 'success' : 'secondary'}>{workflows.find((w) => w.id === activeId)?.status}</Badge>
                        <Button size="sm" variant="outline" onClick={() => void updateStatus.mutateAsync({ id: activeId, status: workflows.find((w) => w.id === activeId)?.status === 'active' ? 'draft' : 'active' })}>Toggle active</Button>
                      </div>
                    </CardContent>
                  </Card>
                  <Tabs defaultValue="builder">
                    <TabsList><TabsTrigger value="builder">Builder</TabsTrigger><TabsTrigger value="runs">Runs</TabsTrigger></TabsList>
                    <TabsContent value="builder" className="mt-4 space-y-4">
                      <WorkflowCanvas triggerType={workflows.find((w) => w.id === activeId)!.trigger_type} steps={(steps ?? []).map((s) => ({ id: s.id, step_order: s.step_order, step_type: s.step_type, template_body: s.template_body }))} status={workflows.find((w) => w.id === activeId)!.status} />
                      <Card className="border-border/40">
                        <CardHeader><CardTitle className="text-sm">Add step</CardTitle></CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                          <Select value={stepType} onValueChange={setStepType}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{STEP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                          <Input className="flex-1 min-w-[200px]" placeholder="Template body" value={stepBody} onChange={(e) => setStepBody(e.target.value)} />
                          <Button onClick={() => void handleAddStep()} disabled={addStep.isPending}>Add step</Button>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="runs" className="mt-4 space-y-2">
                      {(runs ?? []).length === 0 ? <EmptyState title="No runs yet" description="Workflow runs appear here once triggers fire." className="py-6" /> : (runs ?? []).map((r: { id: string; status: string; started_at: string }) => (
                        <div key={r.id} className="flex justify-between rounded-lg border border-border/40 p-3 text-sm"><span>{r.status}</span><span className="text-muted-foreground">{new Date(r.started_at).toLocaleString()}</span></div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New workflow</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={wfName} onChange={(e) => setWfName(e.target.value)} placeholder="Booking confirmation" /></div>
            <div><Label>Trigger</Label><Select value={wfTrigger} onValueChange={setWfTrigger}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TRIGGERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button disabled={!wfName.trim() || createWorkflow.isPending} onClick={() => void handleCreate()}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGate>
  )
}
