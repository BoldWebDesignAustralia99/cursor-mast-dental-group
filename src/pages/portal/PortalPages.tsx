import { PermissionGate } from '@/components/auth/PermissionGate'
import { PageHeader } from '@/components/shared/PageStates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'

export function PortalBookingsPage() {
  return (
    <PermissionGate permission="portal.bookings.view">
      <div className="space-y-6">
        <PageHeader title="Bookings" description="Upcoming and past patient appointments" />
        <div className="space-y-2">
          {[
            { name: 'Raewyn Mitchell', time: 'Tue 17 Jun, 10:30 AM', status: 'confirmed' },
            { name: 'John Smith', time: 'Wed 18 Jun, 2:00 PM', status: 'scheduled' },
          ].map((b) => (
            <Card key={b.name} className="border-border/40">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-sm text-muted-foreground">{b.time}</p>
                </div>
                <Badge variant={b.status === 'confirmed' ? 'success' : 'secondary'}>{b.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PermissionGate>
  )
}

export function PortalCreditsPage() {
  return (
    <PermissionGate permission="portal.credits.view">
      <div className="space-y-6">
        <PageHeader title="Credits" description="Balance, top-ups, and purchase history" />
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Current balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold tabular-nums tracking-tight">45</p>
            <p className="mt-1 text-sm text-muted-foreground">credits remaining</p>
            <Button className="mt-4">Buy credits</Button>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader><CardTitle className="text-base">Packages</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { name: 'Starter — 10 credits', price: 4500 },
              { name: 'Growth — 25 credits', price: 10000 },
            ].map((pkg) => (
              <div key={pkg.name} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                <span className="text-sm">{pkg.name}</span>
                <span className="text-sm font-medium tabular-nums">{formatCurrency(pkg.price)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}

export function PortalCalendarPage() {
  return (
    <PermissionGate permission="portal.calendar.manage">
      <div className="space-y-6">
        <PageHeader title="Calendar" description="Manage weekly hours and closed dates" />
        <Tabs defaultValue="hours">
          <TabsList>
            <TabsTrigger value="hours">Weekly hours</TabsTrigger>
            <TabsTrigger value="closed">Closed dates</TabsTrigger>
          </TabsList>
          <TabsContent value="hours" className="mt-4">
            <Card className="border-border/40">
              <CardContent className="p-4 text-sm text-muted-foreground">
                Edit practitioner availability per weekday. Overrides beat weekly hours.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGate>
  )
}
