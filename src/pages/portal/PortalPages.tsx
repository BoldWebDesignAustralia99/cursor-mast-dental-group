import { Link } from 'react-router-dom'
import { format, isFuture } from 'date-fns'
import { Phone, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { PageHeader, EmptyState, ErrorState } from '@/components/shared/PageStates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { usePortalBookings, usePortalCredits, usePractitionerSchedule, useClinicPatientComms, useClinicCallingNumbers } from '@/hooks/usePortal'

export function PortalBookingsPage() {
  const { data: bookings, isLoading, isError, refetch } = usePortalBookings()
  const upcoming = (bookings ?? []).filter((b: { scheduled_start: string }) => isFuture(new Date(b.scheduled_start)))
  const past = (bookings ?? []).filter((b: { scheduled_start: string }) => !isFuture(new Date(b.scheduled_start)))

  const renderList = (items: typeof bookings) => (
    <div className="space-y-2">
      {(items ?? []).map((b: { id: string; patient_name: string; scheduled_start: string; status: string; outcome: string }) => (
        <Card key={b.id} className="border-border/40">
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{b.patient_name}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(b.scheduled_start), 'EEE d MMM, h:mm a')}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">{b.status}</Badge>
              <Badge variant={b.outcome === 'showed' ? 'success' : 'secondary'}>{b.outcome}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <PermissionGate permission="portal.bookings.view">
      <div className="space-y-6">
        <PageHeader title="Bookings" description="Upcoming and past patient appointments" />
        {isError && (
          <ErrorState message="Could not load bookings." onRetry={() => void refetch()} />
        )}
        {isLoading && !isError ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (bookings ?? []).length === 0 ? (
          <EmptyState
            title="No bookings yet"
            description="Patient appointments booked through Mast Dental will appear here."
          />
        ) : (
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-4">
              {upcoming.length === 0 ? (
                <EmptyState title="No upcoming appointments" description="New bookings will show here." />
              ) : renderList(upcoming)}
            </TabsContent>
            <TabsContent value="past" className="mt-4">
              {past.length === 0 ? (
                <EmptyState title="No past appointments" description="Completed visits will appear here." />
              ) : renderList(past)}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PermissionGate>
  )
}

export function PortalCreditsPage() {
  const { data, isLoading, isError, refetch } = usePortalCredits()

  return (
    <PermissionGate permission="portal.credits.view">
      <div className="space-y-6">
        <PageHeader title="Credits" description="Balance, top-ups, and purchase history" />
        {isError && (
          <ErrorState message="Could not load credit balance." onRetry={() => void refetch()} />
        )}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Current balance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <>
                <p className="text-4xl font-semibold tabular-nums tracking-tight">{data?.balance ?? 0}</p>
                <p className="mt-1 text-sm text-muted-foreground">credits remaining</p>
                <Button
                  className="mt-4 bg-accent-emerald text-accent-emerald-foreground hover:bg-accent-emerald/90"
                  onClick={() => toast.info('Credit purchases — contact your account manager')}
                >
                  Buy credits
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader><CardTitle className="text-base">Packages</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.packages ?? []).length === 0 ? (
              <EmptyState title="No packages available" description="Credit packages will be listed here." className="py-6" />
            ) : (
              (data?.packages ?? []).map((pkg: { name: string; price_cents: number }) => (
                <div key={pkg.name} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                  <span className="text-sm">{pkg.name}</span>
                  <span className="text-sm font-medium tabular-nums">{formatCurrency(pkg.price_cents / 100)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}

export function PortalCalendarPage() {
  const { data: schedule, isLoading, isError, refetch } = usePractitionerSchedule()
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <PermissionGate permission="portal.calendar.manage">
      <div className="space-y-6">
        <PageHeader title="Calendar" description="Manage weekly hours — overrides beat weekly hours" />
        {isError && (
          <ErrorState message="Could not load schedule." onRetry={() => void refetch()} />
        )}
        <Tabs defaultValue="hours">
          <TabsList>
            <TabsTrigger value="hours">Weekly hours</TabsTrigger>
            <TabsTrigger value="preview">14-day preview</TabsTrigger>
          </TabsList>
          <TabsContent value="hours" className="mt-4">
            {isLoading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : (schedule ?? []).length === 0 ? (
              <EmptyState
                title="No schedule configured"
                description="Set your practitioners' weekly hours so the sales team can book patients into available slots."
              />
            ) : (
              <Card className="border-border/40">
                <CardContent className="divide-y divide-border/40 p-0">
                  {(schedule ?? []).map((row: { practitioner_name: string; weekday: number; start_time: string; end_time: string }, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 text-sm">
                      <span className="font-medium">{row.practitioner_name}</span>
                      <span className="text-muted-foreground">
                        {weekdays[row.weekday]} · {row.start_time?.slice(0, 5)} – {row.end_time?.slice(0, 5)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <EmptyState
              title="Availability preview"
              description="Live slot preview matches what reps see when booking. Configure weekly hours first — full calendar preview coming soon."
              className="py-8"
            />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGate>
  )
}

export function PortalMessagesPage() {
  const { data: comms, isLoading, isError, refetch } = useClinicPatientComms()

  return (
    <PermissionGate permission="portal.messages.view">
      <div className="space-y-6">
        <PageHeader title="Messages" description="SMS and email with patients — no call recordings shown" />
        {isError && (
          <ErrorState message="Could not load messages." onRetry={() => void refetch()} />
        )}
        {isLoading && !isError ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (comms ?? []).length === 0 ? (
          <EmptyState
            title="No patient messages yet"
            description="SMS and email conversations with your patients will appear here."
          />
        ) : (
          <div className="space-y-2">
            {(comms ?? []).map((c: { id: string; channel: string; direction: string; body: string; created_at: string }) => (
              <Card key={c.id} className="border-border/40">
                <CardContent className="flex items-start gap-3 p-4">
                  <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{c.channel}</Badge>
                      <span className="text-xs text-muted-foreground">{c.direction}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {format(new Date(c.created_at), 'd MMM, h:mm a')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{c.body}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <Button asChild variant="outline">
          <Link to="/clinics/inbox">Open team inbox (internal)</Link>
        </Button>
      </div>
    </PermissionGate>
  )
}

export function PortalCallingPage() {
  const { data: numbers, isLoading, isError, refetch } = useClinicCallingNumbers()

  const handleCall = (phone: string) => {
    toast.message(`Outbound call to ${phone}`, {
      description: 'Configure Twilio clinic portal credentials for live dialing.',
    })
  }

  const handleSms = (phone: string) => {
    toast.message(`SMS to ${phone}`, {
      description: 'Messages route through the automation engine.',
    })
  }

  return (
    <PermissionGate permission="portal.messages.view">
      <div className="space-y-6">
        <PageHeader title="Patient calling" description="Outbound calls and SMS from your clinic number" />
        {isError && (
          <ErrorState message="Could not load calling numbers." onRetry={() => void refetch()} />
        )}
        {isLoading && !isError ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : (
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="text-base">Your numbers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(numbers ?? []).length === 0 ? (
                <EmptyState
                  title="No calling numbers assigned"
                  description="Contact Mast Dental support to provision a Twilio number for your clinic."
                  className="py-6"
                />
              ) : (
                (numbers ?? []).map((n: { id: string; phone_number: string; region: string }) => (
                  <div key={n.id} className="flex flex-col gap-3 rounded-lg border border-border/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-mono text-sm">{n.phone_number}</p>
                      <p className="text-xs text-muted-foreground">{n.region}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => handleCall(n.phone_number)}>
                        <Phone className="size-3.5" />
                        Call patient
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => handleSms(n.phone_number)}>
                        <MessageSquare className="size-3.5" />
                        SMS
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PermissionGate>
  )
}
