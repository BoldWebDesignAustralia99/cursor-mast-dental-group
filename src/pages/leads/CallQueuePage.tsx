import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, MessageSquare, ExternalLink, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, EmptyState, ErrorState } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { useCallQueue, type QueueLead } from '@/hooks/useLeads'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

function filterQueue(rows: QueueLead[], tab: string) {
  if (!rows) return []
  if (tab === 'callbacks') {
    return rows.filter(
      (lead) => lead.next_callback_at && new Date(lead.next_callback_at) <= new Date(),
    )
  }
  if (tab === 'new') {
    return rows.filter((lead) => lead.stage === 'new')
  }
  return rows
}

const STAGE_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'secondary'> = {
  new: 'info',
  contacted: 'secondary',
  callback: 'warning',
  qualified: 'info',
  booked: 'success',
}

export function CallQueuePage() {
  const [page] = useState(1)
  const [tab, setTab] = useState('all')
  const { data, isLoading, isError, refetch } = useCallQueue(page)

  const filtered = useMemo(() => filterQueue(data?.rows ?? [], tab), [data?.rows, tab])

  const emptyCopy =
    tab === 'callbacks'
      ? { title: 'No callbacks due', description: 'All scheduled callbacks are up to date.' }
      : tab === 'new'
        ? { title: 'No new leads today', description: 'New leads will appear here as they arrive.' }
        : { title: 'Queue is empty', description: 'Leads will appear here when allocated to your pod.' }

  return (
    <PermissionGate permission="leads.manage">
      <div className="space-y-6">
        <PageHeader
          title="Call queue"
          description="Your leads, ordered by callback priority and cadence"
        />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All leads</TabsTrigger>
            <TabsTrigger value="callbacks">Callbacks due</TabsTrigger>
            <TabsTrigger value="new">New today</TabsTrigger>
          </TabsList>
        </Tabs>

        {isError && (
          <ErrorState
            message="Could not load the call queue. Check your connection and try again."
            onRetry={() => void refetch()}
          />
        )}

        {isLoading && !isError && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyState title={emptyCopy.title} description={emptyCopy.description} />
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="divide-y divide-border/40 rounded-xl border border-border/40">
            {filtered.map((lead) => {
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

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" className="h-9 gap-2" asChild>
                      <Link to={`/leads/${lead.id}`}>
                        <Phone className="size-3.5" />
                        Call
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 gap-2"
                      onClick={() => toast.info('SMS coming soon — open the lead record to message')}
                    >
                      <MessageSquare className="size-3.5" />
                      SMS
                    </Button>
                    <Button size="sm" variant="ghost" className="h-9 gap-2" asChild>
                      <Link to={`/leads/${lead.id}`}>
                        <ExternalLink className="size-3.5" />
                        Open
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 gap-2"
                      onClick={() => toast.info('Log outcome from the lead record after your call')}
                    >
                      <Clock className="size-3.5" />
                      Log outcome
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PermissionGate>
  )
}
