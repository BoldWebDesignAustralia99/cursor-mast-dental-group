import { useState } from 'react'
import { format, isPast, isToday } from 'date-fns'
import { CheckCircle2, Circle, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { PageHeader, EmptyState } from '@/components/shared/PageStates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/providers/AuthProvider'
import { usePermission } from '@/hooks/usePermissions'
import {
  useCreateTask,
  useStaffProfiles,
  useTasksBoard,
  useUpdateTaskStatus,
  type TaskRow,
} from '@/hooks/useTeam'
import { cn } from '@/lib/utils'

function dueLabel(dueAt: string | null) {
  if (!dueAt) return 'No due date'
  const date = new Date(dueAt)
  if (isToday(date)) return `Today · ${format(date, 'HH:mm')}`
  return format(date, 'd MMM yyyy')
}

function dueVariant(dueAt: string | null, status: string): 'error' | 'warning' | 'secondary' {
  if (status !== 'open' || !dueAt) return 'secondary'
  const date = new Date(dueAt)
  if (isPast(date) && !isToday(date)) return 'error'
  if (isToday(date)) return 'warning'
  return 'secondary'
}

function TaskTable({
  tasks,
  onToggle,
  togglingId,
}: {
  tasks: TaskRow[]
  onToggle: (task: TaskRow) => void
  togglingId?: string
}) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks here"
        description="Create a task or switch tabs to see other items."
        className="py-10"
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead>Task</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={togglingId === task.id}
                onClick={() => onToggle(task)}
                aria-label={task.status === 'open' ? 'Mark complete' : 'Reopen task'}
              >
                {task.status === 'open' ? (
                  <Circle className="size-4 text-muted-foreground" />
                ) : (
                  <CheckCircle2 className="size-4 text-accent-emerald" />
                )}
              </Button>
            </TableCell>
            <TableCell>
              <p className={cn('font-medium', task.status === 'done' && 'text-muted-foreground line-through')}>
                {task.title}
              </p>
              {task.description && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {task.assignee_name ?? 'Unassigned'}
            </TableCell>
            <TableCell>
              <Badge variant={dueVariant(task.due_at, task.status)}>
                {dueLabel(task.due_at)}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={task.status === 'open' ? 'secondary' : 'success'}>
                {task.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function TasksPage() {
  const { profile } = useAuth()
  const { allowed: canManageTeam } = usePermission('team.manage')
  const { data: tasks, isLoading } = useTasksBoard()
  const { data: staff } = useStaffProfiles()
  const createTask = useCreateTask()
  const updateStatus = useUpdateTaskStatus()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [dueAt, setDueAt] = useState('')

  const openTasks = (tasks ?? []).filter((t) => t.status === 'open')
  const doneTasks = (tasks ?? []).filter((t) => t.status === 'done')
  const myOpenTasks = openTasks.filter((t) => t.assigned_to === profile?.id)

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setAssigneeId(profile?.id ?? '')
    setDueAt('')
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    await createTask.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      assigned_to: assigneeId || profile?.id,
      due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
    })
    setDialogOpen(false)
    resetForm()
  }

  const handleToggle = (task: TaskRow) => {
    void updateStatus.mutateAsync({
      id: task.id,
      status: task.status === 'open' ? 'done' : 'open',
    })
  }

  return (
    <PermissionGate permission="team.view">
      <div className="space-y-6">
        <PageHeader
          title="Tasks"
          description="Team follow-ups, assignments, and action items"
          actions={
            <Button className="gap-2" onClick={() => { resetForm(); setDialogOpen(true) }}>
              <Plus className="size-4" />
              New task
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/40">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Open</p>
              <p className="text-2xl font-semibold tabular-nums">{openTasks.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Assigned to me</p>
              <p className="text-2xl font-semibold tabular-nums">{myOpenTasks.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-2xl font-semibold tabular-nums">{doneTasks.length}</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : (
          <Tabs defaultValue="open">
            <TabsList>
              <TabsTrigger value="open">Open ({openTasks.length})</TabsTrigger>
              <TabsTrigger value="mine">My tasks ({myOpenTasks.length})</TabsTrigger>
              <TabsTrigger value="done">Done ({doneTasks.length})</TabsTrigger>
              <TabsTrigger value="all">All ({tasks?.length ?? 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="open" className="mt-4">
              <Card className="border-border/40">
                <CardContent className="p-0">
                  <TaskTable
                    tasks={openTasks}
                    onToggle={handleToggle}
                    togglingId={updateStatus.isPending ? updateStatus.variables?.id : undefined}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="mine" className="mt-4">
              <Card className="border-border/40">
                <CardContent className="p-0">
                  <TaskTable
                    tasks={myOpenTasks}
                    onToggle={handleToggle}
                    togglingId={updateStatus.isPending ? updateStatus.variables?.id : undefined}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="done" className="mt-4">
              <Card className="border-border/40">
                <CardContent className="p-0">
                  <TaskTable
                    tasks={doneTasks}
                    onToggle={handleToggle}
                    togglingId={updateStatus.isPending ? updateStatus.variables?.id : undefined}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="all" className="mt-4">
              <Card className="border-border/40">
                <CardContent className="p-0">
                  <TaskTable
                    tasks={tasks ?? []}
                    onToggle={handleToggle}
                    togglingId={updateStatus.isPending ? updateStatus.variables?.id : undefined}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <p className="text-xs text-muted-foreground">
          Also available under{' '}
          <Link to="/team" className="underline underline-offset-2 hover:text-foreground">
            Team &amp; HR
          </Link>
          .
        </p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Follow up with patient"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description (optional)</Label>
              <textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context or notes"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {canManageTeam && (staff ?? []).length > 0 && (
              <div className="space-y-2">
                <Label>Assign to</Label>
                <Select value={assigneeId || profile?.id} onValueChange={setAssigneeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {(staff ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="task-due">Due date (optional)</Label>
              <Input
                id="task-due"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!title.trim() || createTask.isPending} onClick={() => void handleCreate()}>
              {createTask.isPending ? 'Creating…' : 'Create task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGate>
  )
}
