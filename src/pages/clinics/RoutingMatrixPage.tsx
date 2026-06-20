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
import { useUpdateRoutingWeight, useSendClinicReply } from '@/hooks/useSpecFeatures'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { toast } from 'sonner'

export function RoutingMatrixPage() {
  const { data: matrix, isLoading } = useRoutingMatrix()
  const updateWeight = useUpdateRoutingWeight()
  const [editing, setEditing] = useState<string | null>(null)
  const [weightVal, setWeightVal] = useState('')

  const saveWeight = (zoneId: string, clinicId: string) => {
    const w = parseInt(weightVal, 10)
    if (Number.isNaN(w)) return
    void updateWeight.mutateAsync({ zoneId, clinicId, weight: w }).then(() => {
      toast.success('Weight updated')
      setEditing(null)
    })
  }

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
                  const r = row as { zone_id: string; zone_name: string; clinic_id: string; clinic_name: string; weight: number; cap_per_period: number; period_count: number; credit_balance: number }
                  const key = `${r.zone_id}-${r.clinic_id}`
                  return (
                  <TableRow key={key}>
                    <TableCell>{r.zone_name}</TableCell>
                    <TableCell className="font-medium">{r.clinic_name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {editing === key ? (
                        <div className="flex justify-end gap-1">
                          <Input className="h-8 w-16" value={weightVal} onChange={(e) => setWeightVal(e.target.value)} />
                          <Button size="sm" onClick={() => saveWeight(r.zone_id, r.clinic_id)}>Save</Button>
                        </div>
                      ) : (
                        <button type="button" className="underline-offset-2 hover:underline" onClick={() => { setEditing(key); setWeightVal(String(r.weight)) }}>{r.weight}</button>
                      )}
                    </TableCell>
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
  const sendReply = useSendClinicReply()
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')

  return (
    <PermissionGate permission="clinics.comms.view">
      <div className="space-y-6">
        <PageHeader title="Clinic comms inbox" description="Inbound messages across active clinics" />
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="divide-y divide-border/40 rounded-xl border border-border/40">
            {(messages ?? []).map((item: { id: string; clinic_id: string; clinic_name: string; body: string; created_at: string }) => (
              <div key={item.id} className="p-4 hover:bg-accent/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.clinic_name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.body}</p>
                  </div>
                  <Badge variant="secondary">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </Badge>
                </div>
                {replyTo === item.id ? (
                  <div className="mt-3 flex gap-2">
                    <Input value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Reply…" />
                    <Button size="sm" disabled={!replyBody.trim()} onClick={() => {
                      void sendReply.mutateAsync({ clinicId: item.clinic_id, body: replyBody }).then(() => {
                        toast.success('Reply sent')
                        setReplyTo(null)
                        setReplyBody('')
                      })
                    }}>Send</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="mt-2" onClick={() => setReplyTo(item.id)}>Reply</Button>
                )}
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
