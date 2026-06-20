import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { PageHeader, ErrorState, EmptyState } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useClinic } from '@/hooks/useDashboard'
import { useClinicTimeline, useClinicOnboarding, useClinicLedger } from '@/hooks/useBookings'
import {
  useClinicProposals, useCreateClinicProposal, useClinicContacts, useCreateClinicContact,
  useToggleOnboardingItem, useSendClinicReply,
} from '@/hooks/useSpecFeatures'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

export function ClinicDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: clinic, isLoading, isError, refetch } = useClinic(id)
  const { data: timeline, isLoading: tlLoading } = useClinicTimeline(clinic?.id)
  const { data: onboarding } = useClinicOnboarding(clinic?.id)
  const { data: ledger } = useClinicLedger(clinic?.id)
  const { data: proposals } = useClinicProposals(clinic?.id)
  const { data: contacts } = useClinicContacts(clinic?.id)
  const createProposal = useCreateClinicProposal(clinic?.id)
  const createContact = useCreateClinicContact(clinic?.id)
  const toggleOnboarding = useToggleOnboardingItem(clinic?.id)
  const sendReply = useSendClinicReply()
  const [draft, setDraft] = useState('')
  const [proposalTitle, setProposalTitle] = useState('')
  const [contactName, setContactName] = useState('')
  const [smsBody, setSmsBody] = useState('')

  const { data: pmsLog } = useQuery({
    queryKey: ['pms-sync', clinic?.id],
    enabled: Boolean(clinic?.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pms_sync_log')
        .select('id, direction, action, status, created_at')
        .eq('clinic_id', clinic!.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data as { id: string; direction: string; action: string; status: string; created_at: string }[]
    },
  })

  const handlePmsSync = () => {
    if (!clinic?.id) return
    void api.syncPms(clinic.id).then(() => toast.success('PMS sync queued')).catch(() => toast.error('PMS sync failed'))
  }

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

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />

  if (isError) {
    return (
      <ErrorState message="Could not load this clinic." onRetry={() => void refetch()} />
    )
  }

  if (!clinic) {
    return (
      <ErrorState
        title="Clinic not found"
        message="This clinic may have been removed or you may not have access."
        retryLabel="Back to clinics"
        onRetry={() => navigate('/clinics')}
      />
    )
  }

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
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="proposals">Proposals</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="pms">PMS sync</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="mt-4 space-y-2">
              {tlLoading ? <Skeleton className="h-24" /> : (timeline ?? []).length === 0 ? (
                <EmptyState title="No timeline events" description="Activity for this clinic will appear here." />
              ) : (
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
            <TabsContent value="proposals" className="mt-4 space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Proposal title" value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} />
                <Button disabled={!proposalTitle.trim() || createProposal.isPending} onClick={() => {
                  void createProposal.mutateAsync({ title: proposalTitle, totalCents: 0 }).then(() => {
                    setProposalTitle('')
                    toast.success('Proposal created')
                  })
                }}>Add</Button>
              </div>
              {(proposals ?? []).map((p) => (
                <div key={p.id} className="flex justify-between rounded-lg border border-border/40 p-3 text-sm">
                  <span>{p.title}</span>
                  <Badge variant="secondary">{p.status} · {formatCurrency(p.total_cents / 100)}</Badge>
                </div>
              ))}
              {(proposals ?? []).length === 0 && <EmptyState title="No proposals" description="Create a proposal for this clinic." className="py-6" />}
            </TabsContent>
            <TabsContent value="contacts" className="mt-4 space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Contact name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                <Button disabled={!contactName.trim() || createContact.isPending} onClick={() => {
                  void createContact.mutateAsync({ fullName: contactName }).then(() => {
                    setContactName('')
                    toast.success('Contact added')
                  })
                }}>Add</Button>
              </div>
              {(contacts ?? []).map((c) => (
                <div key={c.id} className="rounded-lg border border-border/40 p-3 text-sm">
                  <p className="font-medium">{c.full_name}{c.is_primary && ' · Primary'}</p>
                  <p className="text-muted-foreground">{c.role ?? 'Contact'}{c.email ? ` · ${c.email}` : ''}</p>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="onboarding" className="mt-4 space-y-2">
              {(onboarding ?? []).map((item: { item_key: string; label: string; is_complete: boolean }) => (
                <div key={item.item_key} className="flex items-center justify-between rounded-lg border border-border/40 p-3 text-sm">
                  <span>{item.label}</span>
                  <Switch
                    checked={item.is_complete}
                    onCheckedChange={(checked) => void toggleOnboarding.mutateAsync({ itemKey: item.item_key, complete: checked })}
                  />
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
            <TabsContent value="pms" className="mt-4 space-y-2">
              <Button size="sm" variant="outline" onClick={handlePmsSync}>Sync with Praktika</Button>
              {(pmsLog ?? []).map((entry) => (
                <div key={entry.id} className="flex justify-between rounded-lg border border-border/40 p-3 text-sm">
                  <span>{entry.direction} · {entry.action}</span>
                  <Badge variant="secondary">{entry.status}</Badge>
                </div>
              ))}
              {(pmsLog ?? []).length === 0 && (
                <EmptyState title="No PMS sync events" description="Sync with Praktika to pull appointments and patient data." className="py-6" />
              )}
            </TabsContent>
          </Tabs>
        </div>
        <aside className="space-y-4">
          <Card className="border-border/40">
            <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="SMS message to clinic" value={smsBody} onChange={(e) => setSmsBody(e.target.value)} />
              <Button variant="outline" className="w-full" disabled={!smsBody.trim() || sendReply.isPending} onClick={() => {
                void sendReply.mutateAsync({ clinicId: clinic.id, body: smsBody }).then(() => {
                  setSmsBody('')
                  toast.success('Message sent')
                })
              }}>Send SMS</Button>
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
