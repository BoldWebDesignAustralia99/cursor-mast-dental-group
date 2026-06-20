import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useClinicsList } from '@/hooks/useDashboard'
import { useClinicTimeline, useClinicOnboarding, useClinicLedger } from '@/hooks/useBookings'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useState } from 'react'

export function ClinicDetailPage() {
  const { id } = useParams()
  const { data } = useClinicsList(null, 1)
  const clinic = data?.rows.find((c) => c.id === id) ?? data?.rows[0]
  const { data: timeline, isLoading: tlLoading } = useClinicTimeline(clinic?.id)
  const { data: onboarding } = useClinicOnboarding(clinic?.id)
  const { data: ledger } = useClinicLedger(clinic?.id)
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

  if (!clinic) return <Skeleton className="h-64 w-full" />

  return (
    <PermissionGate permission="clinics.view">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <PageHeader
            title={clinic.name}
            description={`${clinic.suburb ?? ''} · ${clinic.stage}`}
            actions={<Badge variant="secondary">{clinic.credit_balance} credits</Badge>}
          />
          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="mt-4 space-y-2">
              {tlLoading ? <Skeleton className="h-24" /> : (
                (timeline ?? []).map((e: { id?: string; item_type?: string; summary: string; created_at: string }, i: number) => (
                  <Card key={e.id ?? i} className="border-border/40">
                    <CardContent className="flex justify-between p-3 text-sm">
                      <span>{e.summary}</span>
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(e.created_at), 'd MMM HH:mm')}
                      </span>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
            <TabsContent value="onboarding" className="mt-4 space-y-2">
              {(onboarding ?? []).map((item: { item_key: string; label: string; is_complete: boolean }) => (
                <div key={item.item_key} className="flex items-center justify-between rounded-lg border border-border/40 p-3 text-sm">
                  <span>{item.label}</span>
                  <Badge variant={item.is_complete ? 'success' : 'secondary'}>
                    {item.is_complete ? 'Done' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="billing" className="mt-4 space-y-2">
              {(ledger ?? []).map((entry: { id: string; amount: number; balance_after: number; reason: string; created_at: string }) => (
                <div key={entry.id} className="flex justify-between rounded-lg border border-border/40 p-3 text-sm">
                  <span>{entry.reason} ({entry.amount > 0 ? '+' : ''}{entry.amount})</span>
                  <span className="text-muted-foreground tabular-nums">Balance: {entry.balance_after}</span>
                </div>
              ))}
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
