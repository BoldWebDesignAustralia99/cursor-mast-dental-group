import { formatDistanceToNow } from 'date-fns'
import { PageHeader, EmptyState } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useRoutingMatrix, useCommsInbox } from '@/hooks/useBookings'

export function RoutingMatrixPage() {
  const { data: matrix, isLoading } = useRoutingMatrix()

  return (
    <PermissionGate permission="leads.manage">
      <div className="space-y-6">
        <PageHeader title="Routing matrix" description="Zones × clinics with live distribution counts" />
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
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
                {(matrix ?? []).map((row) => {
                  const r = row as { zone_name: string; clinic_name: string; weight: number; cap_per_period: number; period_count: number; credit_balance: number }
                  return (
                  <TableRow key={`${r.zone_name}-${r.clinic_name}`}>
                    <TableCell>{r.zone_name}</TableCell>
                    <TableCell className="font-medium">{r.clinic_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.weight}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.cap_per_period}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.period_count}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.credit_balance <= 5 ? 'warning' : 'secondary'}>{r.credit_balance}</Badge>
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
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
  const { data: messages, isLoading } = useCommsInbox()

  return (
    <PermissionGate permission="clinics.comms.view">
      <div className="space-y-6">
        <PageHeader title="Clinic comms inbox" description="Inbound messages across active clinics" />
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="divide-y divide-border/40 rounded-xl border border-border/40">
            {(messages ?? []).map((item: { id: string; clinic_name: string; body: string; created_at: string }) => (
              <div key={item.id} className="flex items-center justify-between p-4 hover:bg-accent/30">
                <div>
                  <p className="font-medium text-sm">{item.clinic_name}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.body}</p>
                </div>
                <Badge variant="secondary">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </Badge>
              </div>
            ))}
            {(messages ?? []).length === 0 ? (
              <EmptyState title="Inbox is empty" description="Inbound clinic messages will appear here." className="m-4" />
            ) : null}
          </div>
        )}
      </div>
    </PermissionGate>
  )
}
