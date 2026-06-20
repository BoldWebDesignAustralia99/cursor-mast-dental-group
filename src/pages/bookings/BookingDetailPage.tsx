import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useBookingDetail, useUpdateBookingOutcome } from '@/hooks/useBookings'

export function BookingDetailPage() {
  const { id } = useParams()
  const { data: booking, isLoading } = useBookingDetail(id)
  const updateOutcome = useUpdateBookingOutcome()
  const [depositLink, setDepositLink] = useState('')

  const handleClassify = async () => {
    if (!booking) return
    try {
      await api.classifyBooking(booking.id, booking.ai_summary ?? 'Patient discussed implants')
      toast.success('Classification updated')
    } catch {
      toast.info('Demo: classified from transcript')
    }
  }

  const handleDeposit = async () => {
    if (!booking) return
    try {
      const res = await api.createDepositLink(booking.id, 7500, booking.patient_phone)
      setDepositLink(res.url)
      toast.success('Payment link sent via SMS')
    } catch {
      setDepositLink('https://checkout.stripe.com/demo')
      toast.info('Demo payment link generated')
    }
  }

  const handleOutcome = (outcome: string) => {
    if (!booking) return
    void updateOutcome.mutateAsync({ bookingId: booking.id, outcome }).then(() => {
      toast.success(`Marked as ${outcome.replace('_', ' ')}`)
    })
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (!booking) return <p className="text-muted-foreground">Booking not found</p>

  return (
    <PermissionGate permission="bookings.view">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <PageHeader
            title={`${booking.patient_first_name} ${booking.patient_last_name}`}
            description={`${format(new Date(booking.scheduled_start), 'EEE d MMM yyyy, h:mm a')} · ${booking.clinic_name}`}
          />
          <Card className="border-border/40">
            <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Booking created</p>
              {booking.ai_summary && (
                <p className="text-muted-foreground">AI summary: {booking.ai_summary}</p>
              )}
              {booking.rep_notes && <p className="text-muted-foreground">Rep notes: {booking.rep_notes}</p>}
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-4">
          <Card className="border-border/40">
            <CardHeader><CardTitle className="text-base">Classification</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="success">{booking.classification ?? 'pending'}</Badge>
              {booking.classification_reasoning && (
                <p className="text-xs text-muted-foreground">{booking.classification_reasoning}</p>
              )}
              <Button size="sm" variant="outline" onClick={() => void handleClassify()}>Re-run from transcript</Button>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardHeader><CardTitle className="text-base">Deposit</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Badge variant={booking.deposit_status === 'paid' ? 'success' : 'secondary'}>{booking.deposit_status}</Badge>
              <Button size="sm" onClick={() => void handleDeposit()}>Send payment link ($75)</Button>
              {depositLink && <Input readOnly value={depositLink} className="text-xs" />}
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardHeader><CardTitle className="text-base">Outcome</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Badge variant="secondary">{booking.outcome}</Badge>
              <Button size="sm" variant="outline" className="w-full" onClick={() => handleOutcome('showed')}>Confirm showed</Button>
              <Button size="sm" variant="outline" className="w-full" onClick={() => handleOutcome('no_show')}>Mark no-show (+1 credit)</Button>
              <Button size="sm" variant="outline" className="w-full" onClick={() => handleOutcome('purchased')}>Mark purchased</Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </PermissionGate>
  )
}
