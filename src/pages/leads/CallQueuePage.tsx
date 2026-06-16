import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, MessageSquare, ExternalLink, Clock } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { useCallQueue } from '@/hooks/useLeads'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

const STAGE_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'secondary'> = {
  new: 'info',
  contacted: 'secondary',
  callback: 'warning',
  qualified: 'info',
  booked: 'success',
}

export function CallQueuePage() {
  const [page] = useState(1)
  const { data, isLoading } = useCallQueue(page)

  return (
    <PermissionGate permission="calls.queue.view">
      <div className="space-y-6">
        <PageHeader
          title="Call queue"
          description="Your leads, ordered by callback priority and cadence"
        />

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All leads</TabsTrigger>
            <TabsTrigger value="callbacks">Callbacks due</TabsTrigger>
            <TabsTrigger value="new">New today</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}

        <div className="divide-y divide-border/40 rounded-xl border border-border/40">
          {data?.rows.map((lead) => {
            const isCallbackDue =
              lead.next_callback_at &&
              new Date(lead.next_callback_at) <= new Date()

            return (
              <div
                key={lead.id}
                className={cn(
                  'flex flex-col gap-3 p-4 transition-colors hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between',
                  isCallbackDue && 'bg-status-warning/5',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/leads/${lead.id}`}
                      className="font-medium hover:underline"
                    >
                      {lead.first_name} {lead.last_name}
                    </Link>
                    <Badge variant={STAGE_VARIANT[lead.stage] ?? 'secondary'}>
                      {lead.stage}
                    </Badge>
                    {isCallbackDue && (
                      <Badge variant="warning">Callback due</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {lead.phone} · {lead.suburb}
                    {lead.treatment_interest && ` · ${lead.treatment_interest}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {lead.call_count} calls
                    {lead.next_callback_at && (
                      <> · Callback {formatDistanceToNow(new Date(lead.next_callback_at), { addSuffix: true })}</>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="outline" className="h-9 gap-2" asChild>
                    <Link to={`/leads/${lead.id}`}>
                      <Phone className="size-3.5" />
                      Call
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 gap-2">
                    <MessageSquare className="size-3.5" />
                    SMS
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 gap-2" asChild>
                    <Link to={`/leads/${lead.id}`}>
                      <ExternalLink className="size-3.5" />
                      Open record
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 gap-2">
                    <Clock className="size-3.5" />
                    Log outcome
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PermissionGate>
  )
}
