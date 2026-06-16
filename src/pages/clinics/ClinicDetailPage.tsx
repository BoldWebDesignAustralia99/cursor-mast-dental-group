import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClinicsList } from '@/hooks/useDashboard'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useState } from 'react'

export function ClinicDetailPage() {
  const { id } = useParams()
  const { data } = useClinicsList(null, 1)
  const clinic = data?.rows.find((c) => c.id === id) ?? data?.rows[0]
  const [draft, setDraft] = useState('')

  const handleDraftReply = async () => {
    try {
      const res = await api.aiClinicReply('demo', 'Clinic asking about booking capacity next week')
      setDraft(res.draft)
      toast.success('Draft ready')
    } catch {
      setDraft('Thanks for reaching out — we have capacity next week and can send through booking details shortly.')
      toast.info('Demo draft generated')
    }
  }

  if (!clinic) return null

  return (
    <PermissionGate permission="clinics.view">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <PageHeader
            title={clinic.name}
            description={`${clinic.suburb} · ${clinic.stage}`}
            actions={<Badge variant="secondary">{clinic.credit_balance} credits</Badge>}
          />
          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="proposals">Proposals</TabsTrigger>
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="mt-4 space-y-2">
              {['Proposal sent', 'Call logged', 'Clinic created'].map((e) => (
                <Card key={e} className="border-border/40">
                  <CardContent className="p-3 text-sm">{e}</CardContent>
                </Card>
              ))}
            </TabsContent>
            <TabsContent value="proposals" className="mt-4">
              <Button>Send proposal</Button>
            </TabsContent>
            <TabsContent value="onboarding" className="mt-4 space-y-2">
              {['Portal accounts', 'Calendars', 'GoCardless mandate', 'First booking'].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-lg border border-border/40 p-3 text-sm">
                  <span>{item}</span>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="billing" className="mt-4">
              <p className="text-sm text-muted-foreground">Credit ledger and invoices</p>
            </TabsContent>
          </Tabs>
        </div>
        <aside className="space-y-4">
          <Card className="border-border/40">
            <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full">Call clinic</Button>
              <Button variant="outline" className="w-full">Send SMS</Button>
              <Button variant="outline" className="w-full" onClick={() => void handleDraftReply()}>Draft reply with AI</Button>
            </CardContent>
          </Card>
          {draft && (
            <Card className="border-border/40">
              <CardHeader><CardTitle className="text-base">AI draft</CardTitle></CardHeader>
              <CardContent className="text-sm">{draft}</CardContent>
            </Card>
          )}
        </aside>
      </div>
    </PermissionGate>
  )
}
