import { PageHeader, EmptyState } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClassificationReviews } from '@/hooks/useBookings'
import { useResolveClassificationReview } from '@/hooks/useSpecFeatures'
import { toast } from 'sonner'

export function ClassificationReviewsPage() {
  const { data: pending, isLoading } = useClassificationReviews('pending')
  const { data: all } = useClassificationReviews('all')
  const resolve = useResolveClassificationReview()

  const handleResolve = async (id: string, decision: 'accepted' | 'rejected') => {
    try {
      await resolve.mutateAsync({ id, decision, notes: decision === 'accepted' ? 'Credit refunded' : 'Dispute rejected' })
      toast.success(decision === 'accepted' ? 'Accepted — credit refunded' : 'Review rejected')
    } catch {
      toast.error('Could not resolve review')
    }
  }

  return (
    <PermissionGate permission="bookings.view">
      <div className="space-y-6">
        <PageHeader
          title="Classification reviews"
          description="Clinic disputes → accept to refund credit, or reject to uphold classification"
        />
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4 space-y-2">
            {isLoading ? <Skeleton className="h-32 rounded-xl" /> : (pending ?? []).length === 0 ? (
              <EmptyState title="No pending reviews" description="Clinic classification disputes will appear here for QA." />
            ) : (
              (pending ?? []).map((r: { id: string; patient_name: string; proposed_classification: string; created_at: string }) => (
                <Card key={r.id} className="border-border/40">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-sm">{r.patient_name}</p>
                      <p className="text-xs text-muted-foreground">Proposed: {r.proposed_classification}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={resolve.isPending} onClick={() => void handleResolve(r.id, 'rejected')}>
                        Reject
                      </Button>
                      <Button size="sm" disabled={resolve.isPending} onClick={() => void handleResolve(r.id, 'accepted')}>
                        Accept + refund
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          <TabsContent value="all" className="mt-4 space-y-2">
            {(all ?? []).length === 0 ? (
              <EmptyState title="No reviews yet" description="Classification review history will appear here." />
            ) : (
              (all ?? []).map((r: { id: string; patient_name: string; status: string }) => (
                <Card key={r.id} className="border-border/40">
                  <CardContent className="flex justify-between p-4 text-sm">
                    <span>{r.patient_name}</span>
                    <Badge variant="secondary">{r.status}</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGate>
  )
}
