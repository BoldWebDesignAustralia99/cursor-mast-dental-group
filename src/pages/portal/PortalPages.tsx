import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Phone, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { PageHeader } from '@/components/shared/PageStates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { usePortalBookings, usePortalCredits, usePractitionerSchedule, useClinicPatientComms, useClinicCallingNumbers } from '@/hooks/usePortal'

export function PortalBookingsPage() {
  const { data: bookings, isLoading } = usePortalBookings()

  return (
    <PermissionGate permission="portal.bookings.view">
      <div className="space-y-6">
        <PageHeader title="Bookings" description="Upcoming and past patient appointments" />
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-2">
            {(bookings ?? []).map((b: { id: string; patient_name: string; scheduled_start: string; status: string; outcome: string }) => (
              <Card key={b.id} className="border-border/40">
                <CardContent className="flex items-center justify-between p-4">
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
            {(bookings ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            )}
          </div>
        )}
      </div>
    </PermissionGate>
  )
}

export function PortalCreditsPage() {
  const { data, isLoading } = usePortalCredits()

  return (
    <PermissionGate permission="portal.credits.view">
      <div className="space-y-6">
        <PageHeader title="Credits" description="Balance, top-ups, and purchase history" />
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
                <Button className="mt-4 bg-accent-emerald text-accent-emerald-foreground hover:bg-accent-emerald/90">
                  Buy credits
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader><CardTitle className="text-base">Packages</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.packages ?? []).map((pkg: { name: string; price_cents: number }) => (
              <div key={pkg.name} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                <span className="text-sm">{pkg.name}</span>
                <span className="text-sm font-medium tabular-nums">{formatCurrency(pkg.price_cents / 100)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}

export function PortalCalendarPage() {
  const { data: schedule, isLoading } = usePractitionerSchedule()
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <PermissionGate permission="portal.calendar.manage">
      <div className="space-y-6">
        <PageHeader title="Calendar" description="Manage weekly hours — overrides beat weekly hours" />
        <Tabs defaultValue="hours">
          <TabsList>
            <TabsTrigger value="hours">Weekly hours</TabsTrigger>
            <TabsTrigger value="preview">14-day preview</TabsTrigger>
          </TabsList>
          <TabsContent value="hours" className="mt-4">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
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
                  {(schedule ?? []).length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground">No schedule configured yet.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <Card className="border-border/40">
              <CardContent className="p-4 text-sm text-muted-foreground">
                Live availability preview matches what the sales floor sees when booking. Configure weekly hours above.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGate>
  )
}

export function PortalMessagesPage() {
  const { data: comms, isLoading } = useClinicPatientComms()

  return (
    <PermissionGate permission="portal.messages.view">
      <div className="space-y-6">
        <PageHeader title="Messages" description="SMS and email with patients — no call recordings shown" />
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
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
            {(comms ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No patient messages yet.</p>
            )}
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
  const { data: numbers, isLoading } = useClinicCallingNumbers()

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
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="text-base">Your numbers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(numbers ?? []).map((n: { id: string; phone_number: string; region: string }) => (
                <div key={n.id} className="flex items-center justify-between rounded-lg border border-border/40 p-4">
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
              ))}
              {(numbers ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No calling numbers assigned yet.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PermissionGate>
  )
}
