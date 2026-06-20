import { PermissionGate } from '@/components/auth/PermissionGate'
import { PageHeader } from '@/components/shared/PageStates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useTasksBoard, useTimesheets, useLeaveRequests, useLeaderboard, useCommunityPosts } from '@/hooks/useTeam'
import { format } from 'date-fns'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/40">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function TeamPage() {
  const { data: tasks, isLoading: tasksLoading } = useTasksBoard()
  const { data: timesheets, isLoading: tsLoading } = useTimesheets()
  const { data: leave, isLoading: leaveLoading } = useLeaveRequests()
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard()
  const { data: posts, isLoading: postsLoading } = useCommunityPosts()

  return (
    <PermissionGate permission="team.view">
      <div className="space-y-6">
        <PageHeader title="Team & HR" description="Timesheets, leave, payroll, tasks, and messages" />
        <Tabs defaultValue="tasks">
          <TabsList>
            <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
            <TabsTrigger value="leave">Leave</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>
          <TabsContent value="timesheets" className="mt-4">
            <Section title="Recent timesheets">
              {tsLoading ? <Skeleton className="h-24" /> : (
                <div className="space-y-2">
                  {(timesheets ?? []).map((t: { id: string; staff_name: string; clock_in: string; status: string }) => (
                    <div key={t.id} className="flex justify-between text-sm">
                      <span>{t.staff_name}</span>
                      <span className="text-muted-foreground">{format(new Date(t.clock_in), 'd MMM HH:mm')} · {t.status}</span>
                    </div>
                  ))}
                  {(timesheets ?? []).length === 0 && <p className="text-sm text-muted-foreground">No timesheets yet.</p>}
                </div>
              )}
            </Section>
          </TabsContent>
          <TabsContent value="leave" className="mt-4">
            <Section title="Leave requests">
              {leaveLoading ? <Skeleton className="h-24" /> : (
                <div className="space-y-2">
                  {(leave ?? []).map((l) => (
                    <div key={l.id} className="flex justify-between text-sm">
                      <span>{l.staff_name} — {l.leave_type}</span>
                      <Badge variant="secondary">{l.status}</Badge>
                    </div>
                  ))}
                  {(leave ?? []).length === 0 && <p className="text-sm text-muted-foreground">No leave requests.</p>}
                </div>
              )}
            </Section>
          </TabsContent>
          <TabsContent value="tasks" className="mt-4">
            <Section title="Open tasks">
              {tasksLoading ? <Skeleton className="h-24" /> : (
                <div className="space-y-2">
                  {(tasks ?? []).map((t: { id: string; title: string; status: string; assignee_name: string | null }) => (
                    <div key={t.id} className="flex justify-between text-sm">
                      <span>{t.title}</span>
                      <Badge variant="secondary">{t.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </TabsContent>
          <TabsContent value="community" className="mt-4">
            <Section title="Community feed">
              {postsLoading ? <Skeleton className="h-24" /> : (
                <div className="space-y-3">
                  {(posts ?? []).map((p: { id: string; body: string; author_name: string }) => (
                    <div key={p.id} className="rounded-lg border border-border/40 p-3 text-sm">
                      <p className="font-medium text-xs text-muted-foreground mb-1">{p.author_name}</p>
                      <p>{p.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </TabsContent>
          <TabsContent value="leaderboard" className="mt-4">
            <Section title="This month">
              {lbLoading ? <Skeleton className="h-32" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rep</TableHead>
                      <TableHead className="text-right">Bookings</TableHead>
                      <TableHead className="text-right">Shows</TableHead>
                      <TableHead className="text-right">Avg grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(leaderboard ?? []).map((r: { staff_id: string; full_name: string; bookings_month: number; shows_month: number; avg_grade: number | null }) => (
                      <TableRow key={r.staff_id}>
                        <TableCell>{r.full_name}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.bookings_month}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.shows_month}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.avg_grade?.toFixed(0) ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Section>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGate>
  )
}
