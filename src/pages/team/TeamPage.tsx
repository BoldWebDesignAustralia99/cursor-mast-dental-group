import { PermissionGate } from '@/components/auth/PermissionGate'
import { PageHeader } from '@/components/shared/PageStates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/40">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function TeamPage() {
  return (
    <PermissionGate permission="team.view">
      <div className="space-y-6">
        <PageHeader
          title="Team & HR"
          description="Timesheets, leave, payroll, tasks, and messages"
        />
        <Tabs defaultValue="timesheets">
          <TabsList>
            <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
            <TabsTrigger value="leave">Leave</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>
          <TabsContent value="timesheets" className="mt-4">
            <Section title="This week">
              <p className="text-sm text-muted-foreground">Clock in/out from mobile. Manager approvals in the Approvals tab.</p>
            </Section>
          </TabsContent>
          <TabsContent value="leave" className="mt-4">
            <Section title="Leave balances"><p className="text-sm text-muted-foreground">Request and track leave.</p></Section>
          </TabsContent>
          <TabsContent value="tasks" className="mt-4">
            <Section title="Open tasks"><p className="text-sm text-muted-foreground">Internal tasks with assignments and due dates.</p></Section>
          </TabsContent>
          <TabsContent value="messages" className="mt-4">
            <Section title="Messages"><p className="text-sm text-muted-foreground">1:1 and group chat with realtime delivery.</p></Section>
          </TabsContent>
          <TabsContent value="leaderboard" className="mt-4">
            <Section title="Leaderboard"><p className="text-sm text-muted-foreground">Bookings, shows, and grades over selectable periods.</p></Section>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGate>
  )
}
