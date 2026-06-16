import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export function BookingDetailPage() {
  const [classification] = useState('multi_implant')
  const [depositLink, setDepositLink] = useState('')

  const handleClassify = async () => {
    try {
      await api.classifyBooking('demo-booking', 'Patient needs upper and lower implants, full arch')
      toast.success('Classification updated from transcript')
    } catch {
      toast.info('Demo: classified as multi_implant')
    }
  }

  const handleDeposit = async () => {
    try {
      const res = await api.createDepositLink('demo-booking', 50000, '0412660412')
      setDepositLink(res.url)
      toast.success('Payment link sent via SMS')
    } catch {
      setDepositLink('https://checkout.stripe.com/demo')
      toast.info('Demo payment link generated')
    }
  }

  return (
    <PermissionGate permission="bookings.view">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <PageHeader
            title="Raewyn Mitchell"
            description="Tue 17 Jun 2026, 10:30 AM · Mast Dental Moorooka · Dr Evelyn Chin"
          />
          <Card className="border-border/40">
            <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Booking created by sales rep</p>
              <p className="text-muted-foreground">AI summary: Upper & lower set, superannuation funding</p>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-4">
          <Card className="border-border/40">
            <CardHeader><CardTitle className="text-base">Classification</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="success">{classification}</Badge>
              <p className="text-xs text-muted-foreground">Billable — consumes 1 credit</p>
              <Button size="sm" variant="outline" onClick={() => void handleClassify()}>Re-run from transcript</Button>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardHeader><CardTitle className="text-base">Deposit</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary">None</Badge>
              <Button size="sm" onClick={() => void handleDeposit()}>Send payment link</Button>
              {depositLink && <Input readOnly value={depositLink} className="text-xs" />}
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardHeader><CardTitle className="text-base">Outcome</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button size="sm" variant="outline" className="w-full">Confirm showed</Button>
              <Button size="sm" variant="outline" className="w-full">Mark no-show</Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </PermissionGate>
  )
}
