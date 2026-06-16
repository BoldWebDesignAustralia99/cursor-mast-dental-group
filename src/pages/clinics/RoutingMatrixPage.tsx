import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const DEMO_MATRIX = [
  { zone: 'North Brisbane', clinic: 'Mast Dental North Lakes', weight: 3, cap: 20, count: 8, credits: 8 },
  { zone: 'North Brisbane', clinic: 'Mast Dental Chermside', weight: 2, cap: 15, count: 5, credits: 12 },
  { zone: 'South Brisbane', clinic: 'Mast Dental Moorooka', weight: 5, cap: 30, count: 12, credits: 45 },
]

export function RoutingMatrixPage() {
  return (
    <PermissionGate permission="leads.manage">
      <div className="space-y-6">
        <PageHeader title="Routing matrix" description="Zones × clinics with live distribution counts" />
        <Card className="border-border/40">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Zone</TableHead>
                <TableHead>Clinic</TableHead>
                <TableHead className="text-right tabular-nums">Weight</TableHead>
                <TableHead className="text-right tabular-nums">Cap</TableHead>
                <TableHead className="text-right tabular-nums">Period count</TableHead>
                <TableHead className="text-right tabular-nums">Credits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEMO_MATRIX.map((row) => (
                <TableRow key={`${row.zone}-${row.clinic}`}>
                  <TableCell>{row.zone}</TableCell>
                  <TableCell className="font-medium">{row.clinic}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.weight}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.cap}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={row.credits <= 5 ? 'warning' : 'secondary'}>{row.credits}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Clinics at zero credits are excluded from routing automatically. Scheduled jobs reassign leads from paused clinics.
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}

export function CommsInboxPage() {
  return (
    <PermissionGate permission="clinics.comms.view">
      <div className="space-y-6">
        <PageHeader title="Clinic comms inbox" description="Unanswered messages across all active clinics" />
        <div className="divide-y divide-border/40 rounded-xl border border-border/40">
          {[
            { clinic: 'Mast Dental Moorooka', msg: 'Can we get more bookings next week?', due: '2h ago' },
            { clinic: 'Mast Dental Chermside', msg: 'Patient no-show — rebook?', due: '4h ago' },
          ].map((item) => (
            <div key={item.clinic} className="flex items-center justify-between p-4 hover:bg-accent/30">
              <div>
                <p className="font-medium text-sm">{item.clinic}</p>
                <p className="text-sm text-muted-foreground">{item.msg}</p>
              </div>
              <Badge variant="warning">{item.due}</Badge>
            </div>
          ))}
        </div>
      </div>
    </PermissionGate>
  )
}
