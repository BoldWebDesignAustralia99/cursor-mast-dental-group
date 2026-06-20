import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader, EmptyState } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

const CHANNELS = [
  { id: 'team', name: 'Sales team', unread: 0 },
  { id: 'sarah', name: 'Sarah Chen', unread: 1 },
  { id: 'mike', name: 'Mike Torres', unread: 0 },
]

const DEMO_MESSAGES: Record<string, { id: string; sender: string; body: string; time: string }[]> = {
  team: [
    { id: '1', sender: 'Sarah Chen', body: 'Great close on the Moorooka booking!', time: '10:32 AM' },
    { id: '2', sender: 'You', body: 'Thanks — superannuation funding made it easy', time: '10:35 AM' },
  ],
  sarah: [{ id: '3', sender: 'Sarah Chen', body: 'Can you cover my callbacks at 2pm?', time: '9:15 AM' }],
  mike: [],
}

export function MessagesPage() {
  const [message, setMessage] = useState('')
  const [activeChannel, setActiveChannel] = useState('team')
  const messages = DEMO_MESSAGES[activeChannel] ?? []
  const channelName = CHANNELS.find((c) => c.id === activeChannel)?.name ?? 'Messages'

  const handleSend = () => {
    if (!message.trim()) return
    toast.info('Realtime messaging — connect Supabase Realtime to send live messages')
    setMessage('')
  }

  return (
    <PermissionGate permission="team.view">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="border-border/40">
          <CardContent className="p-2">
            {CHANNELS.map((c) => (
              <Button
                key={c.id}
                type="button"
                variant="ghost"
                className={cn(
                  'h-auto w-full justify-between px-2 py-2 text-sm font-normal',
                  activeChannel === c.id && 'bg-accent',
                )}
                onClick={() => setActiveChannel(c.id)}
              >
                <span>{c.name}</span>
                {c.unread > 0 && <Badge variant="info" className="text-[10px]">{c.unread}</Badge>}
              </Button>
            ))}
          </CardContent>
        </Card>
        <div className="flex min-h-[420px] flex-col rounded-xl border border-border/40">
          <div className="border-b border-border/40 p-4">
            <PageHeader title={channelName} description="Internal messages · demo data until Realtime is connected" />
          </div>
          <div className="flex-1 space-y-4 overflow-auto p-4">
            {messages.length === 0 ? (
              <EmptyState
                title="No messages yet"
                description="Start a conversation with your team."
                className="py-8"
              />
            ) : (
              messages.map((m) => (
                <div key={m.id} className={cn(m.sender === 'You' && 'text-right')}>
                  <div className={cn(
                    'inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    m.sender === 'You' ? 'bg-foreground text-background' : 'bg-muted',
                  )}>
                    <p className="text-xs font-medium opacity-70">{m.sender} · {m.time}</p>
                    <p className="mt-1">{m.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 border-t border-border/40 p-4">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message…"
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button onClick={handleSend}>Send</Button>
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
            <Button size="lg" className="h-14 min-w-44" onClick={() => toast.info('Timesheet clock — wire to HR module')}>Clock in</Button>
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
        <PageHeader title="Leave" description="Request and track leave balances" actions={<Button onClick={() => toast.info('Leave requests — coming soon')}>Request leave</Button>} />
        <Card className="border-border/40">
          <CardContent className="p-4 text-sm text-muted-foreground">Annual leave: 15 days remaining</CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}

export function PayrollPage() {
  const handleXeroConnect = () => {
    void api.xeroOAuthStart().then((res) => {
      if (res.auth_url) window.open(res.auth_url, '_blank')
      else toast.message('Configure XERO_CLIENT_ID in Edge Function secrets')
    })
  }

  const handlePushPayroll = () => {
    void api.xeroPushPayroll('demo-run-id').then(() => toast.success('Payroll push queued')).catch(() => toast.error('Xero not configured'))
  }

  return (
    <PermissionGate permission="payroll.view">
      <div className="space-y-6">
        <PageHeader
          title="Payroll"
          description="Pay periods, commission, and Xero push"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleXeroConnect}>Connect Xero</Button>
              <Button size="sm" onClick={handlePushPayroll}>Push to Xero</Button>
            </div>
          }
        />
        <Card className="border-border/40">
          <CardContent className="p-4 text-sm">Current period: 1–15 Jun 2026 · Status: Draft</CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}
