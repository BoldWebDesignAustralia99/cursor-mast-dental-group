import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function MessagesPage() {
  const [message, setMessage] = useState('')
  const [messages] = useState([
    { id: '1', sender: 'Sarah Chen', body: 'Great close on the Moorooka booking!', time: '10:32 AM' },
    { id: '2', sender: 'You', body: 'Thanks — superannuation funding made it easy', time: '10:35 AM' },
  ])

  return (
    <PermissionGate permission="team.view">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="border-border/40">
          <CardContent className="p-2">
            {['Sales team', 'Sarah Chen', 'Mike Torres'].map((c) => (
              <Button
                key={c}
                type="button"
                variant="ghost"
                className="h-8 w-full justify-start px-2 text-sm font-normal"
              >
                {c}
              </Button>
            ))}
          </CardContent>
        </Card>
        <div className="flex flex-col rounded-xl border border-border/40">
          <div className="border-b border-border/40 p-4">
            <PageHeader title="Sales team" description="Internal messages · realtime when connected" />
          </div>
          <div className="flex-1 space-y-3 p-4">
            {messages.map((m) => (
              <div key={m.id}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{m.sender}</span>
                  <span className="text-xs text-muted-foreground">{m.time}</span>
                </div>
                <p className="mt-1 text-sm">{m.body}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-border/40 p-4">
            <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message…" />
            <Button>Send message</Button>
          </div>
        </div>
      </div>
    </PermissionGate>
  )
}

export function CommunityPage() {
  return (
    <PermissionGate permission="team.view">
      <div className="space-y-6">
        <PageHeader title="Community" description="Wins and announcements" />
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant="success">Win</Badge>
              <span className="font-medium text-sm">Sarah booked 3 shows today</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Keep it up team — north Brisbane is on fire this week.</p>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}

export function TimesheetPage() {
  return (
    <PermissionGate permission="team.view">
      <div className="space-y-6">
        <PageHeader title="Timesheet" description="Clock in/out and weekly hours" />
        <Card className="border-border/40">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <p className="text-4xl font-semibold tabular-nums">0:00:00</p>
            <Button size="lg" className="h-14 min-w-44">Clock in</Button>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}

export function LeavePage() {
  return (
    <PermissionGate permission="team.view">
      <div className="space-y-6">
        <PageHeader title="Leave" description="Request and track leave balances" actions={<Button>Request leave</Button>} />
        <Card className="border-border/40">
          <CardContent className="p-4 text-sm text-muted-foreground">Annual leave: 15 days remaining</CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}

export function PayrollPage() {
  return (
    <PermissionGate permission="payroll.view">
      <div className="space-y-6">
        <PageHeader title="Payroll" description="Pay periods, commission, and Xero push" />
        <Card className="border-border/40">
          <CardContent className="p-4 text-sm">Current period: 1–15 Jun 2026 · Status: Draft</CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}
