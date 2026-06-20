import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'
import { PageHeader, EmptyState } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  useMessageChannels, useChannelMessages, useSendInternalMessage,
  useCreateCommunityPost, useActiveTimesheet, useTimesheetClock, useCreateLeaveRequest,
} from '@/hooks/useSpecFeatures'
import { useLeaveRequests } from '@/hooks/useTeam'
import { useCommunityPosts } from '@/hooks/useTeam'

export function MessagesPage() {
  const { data: channels } = useMessageChannels()
  const [activeChannel, setActiveChannel] = useState<string | undefined>()
  useEffect(() => { if (channels?.[0] && !activeChannel) setActiveChannel(channels[0].id) }, [channels, activeChannel])
  const { data: messages } = useChannelMessages(activeChannel)
  const send = useSendInternalMessage()
  const [message, setMessage] = useState('')
  const channelName = channels?.find((c) => c.id === activeChannel)?.name ?? 'Messages'

  const handleSend = () => {
    if (!message.trim() || !activeChannel) return
    void send.mutateAsync({ channelId: activeChannel, body: message.trim() }).then(() => {
      setMessage('')
      toast.success('Message sent')
    })
  }

  return (
    <PermissionGate permission="team.view">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="border-border/40">
          <CardContent className="p-2">
            {(channels ?? []).map((c) => (
              <Button key={c.id} type="button" variant="ghost" className={cn('h-auto w-full justify-between px-2 py-2 text-sm font-normal', activeChannel === c.id && 'bg-accent')} onClick={() => setActiveChannel(c.id)}>
                <span>{c.name}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
        <div className="flex min-h-[420px] flex-col rounded-xl border border-border/40">
          <div className="border-b border-border/40 p-4"><PageHeader title={channelName} description="Internal team messages" /></div>
          <div className="flex-1 space-y-4 overflow-auto p-4">
            {(messages ?? []).length === 0 ? <EmptyState title="No messages yet" description="Start a conversation." className="py-8" /> : (messages ?? []).map((m) => (
              <div key={m.id} className={cn(m.is_mine && 'text-right')}>
                <div className={cn('inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm', m.is_mine ? 'bg-foreground text-background' : 'bg-muted')}>
                  <p className="text-xs font-medium opacity-70">{m.sender_name}</p>
                  <p className="mt-1">{m.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-border/40 p-4">
            <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message…" onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
            <Button onClick={handleSend}>Send</Button>
          </div>
        </div>
      </div>
    </PermissionGate>
  )
}

export function CommunityPage() {
  const { data: posts, isLoading } = useCommunityPosts()
  const createPost = useCreateCommunityPost()
  const [body, setBody] = useState('')

  return (
    <PermissionGate permission="team.view">
      <div className="space-y-6">
        <PageHeader title="Community" description="Wins and announcements" />
        <div className="flex gap-2">
          <Input placeholder="Share a win…" value={body} onChange={(e) => setBody(e.target.value)} />
          <Button disabled={!body.trim() || createPost.isPending} onClick={() => void createPost.mutateAsync(body).then(() => { setBody(''); toast.success('Posted') })}>Post</Button>
        </div>
        {isLoading ? null : (posts ?? []).map((p) => (
          <Card key={p.id} className="border-border/40">
            <CardContent className="p-4">
              <Badge variant="success" className="mb-2">Update</Badge>
              <p className="text-sm font-medium">{p.author_name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PermissionGate>
  )
}

export function TimesheetPage() {
  const { data: active } = useActiveTimesheet()
  const { clockIn, clockOut } = useTimesheetClock()
  const [elapsed, setElapsed] = useState('0:00:00')

  useEffect(() => {
    if (!active?.clock_in) return
    const tick = () => {
      const s = Math.floor((Date.now() - new Date(active.clock_in).getTime()) / 1000)
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      setElapsed(`${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [active?.clock_in])

  return (
    <PermissionGate permission="team.view">
      <div className="space-y-6">
        <PageHeader title="Timesheet" description="Clock in/out and weekly hours" />
        <Card className="border-border/40">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <p className="text-4xl font-semibold tabular-nums">{active ? elapsed : '0:00:00'}</p>
            <Button size="lg" className="h-14 min-w-44" disabled={clockIn.isPending || clockOut.isPending} onClick={() => {
              if (active) void clockOut.mutateAsync().then(() => toast.success('Clocked out'))
              else void clockIn.mutateAsync().then(() => toast.success('Clocked in'))
            }}>{active ? 'Clock out' : 'Clock in'}</Button>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}

export function LeavePage() {
  const { data: leave } = useLeaveRequests()
  const createLeave = useCreateLeaveRequest()
  const [leaveType, setLeaveType] = useState('annual')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))

  return (
    <PermissionGate permission="team.view">
      <div className="space-y-6">
        <PageHeader title="Leave" description="Request and track leave balances" />
        <Card className="border-border/40">
          <CardContent className="space-y-3 p-4">
            <Input value={leaveType} onChange={(e) => setLeaveType(e.target.value)} placeholder="Leave type (annual, sick…)" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button disabled={createLeave.isPending} onClick={() => void createLeave.mutateAsync({ leaveType, startDate, endDate }).then(() => toast.success('Leave request submitted'))}>Request leave</Button>
          </CardContent>
        </Card>
        <div className="space-y-2">
          {(leave ?? []).map((l) => (
            <div key={l.id} className="flex justify-between rounded-lg border border-border/40 p-3 text-sm">
              <span>{l.staff_name} — {l.leave_type}</span>
              <Badge variant="secondary">{l.status}</Badge>
            </div>
          ))}
        </div>
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
        <PageHeader title="Payroll" description="Pay periods, commission, and Xero push" actions={<div className="flex gap-2"><Button variant="outline" size="sm" onClick={handleXeroConnect}>Connect Xero</Button><Button size="sm" onClick={handlePushPayroll}>Push to Xero</Button></div>} />
        <Card className="border-border/40"><CardContent className="p-4 text-sm">Current period: 1–15 Jun 2026 · Status: Draft</CardContent></Card>
      </div>
    </PermissionGate>
  )
}
