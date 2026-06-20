import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, EmptyState, ErrorState } from '@/components/shared/PageStates'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { useClinicsList } from '@/hooks/useDashboard'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PAGE_SIZE } from '@/lib/constants'

export function ClinicsPage() {
  const [stage, setStage] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useClinicsList(stage, page)
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE)
  const rows = data?.rows ?? []

  const stageLabel = stage ?? 'all'

  return (
    <PermissionGate permission="clinics.view">
      <div className="space-y-6">
        <PageHeader title="Clinic CRM" description="Pipeline, onboarding, and active clinics" />

        <Tabs value={stage ?? 'all'} onValueChange={(v) => { setStage(v === 'all' ? null : v); setPage(1) }}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            <TabsTrigger value="lead">Pipeline</TabsTrigger>
          </TabsList>
        </Tabs>

        {isError && (
          <ErrorState message="Could not load clinics." onRetry={() => void refetch()} />
        )}

        {isLoading && !isError && (
          <Skeleton className="h-64 w-full rounded-xl" />
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <EmptyState
            title={`No ${stageLabel === 'all' ? '' : stageLabel + ' '}clinics`}
            description="Clinics in this stage will appear here as they move through onboarding."
          />
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <>
            <div className="hidden rounded-xl border border-border/40 md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Clinic</TableHead>
                    <TableHead>Suburb</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right tabular-nums">Credits</TableHead>
                    <TableHead>Country</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-accent/30">
                      <TableCell className="font-medium">
                        <Link to={`/clinics/${c.id}`} className="hover:underline">{c.name}</Link>
                      </TableCell>
                      <TableCell>{c.suburb}</TableCell>
                      <TableCell><Badge variant="secondary">{c.stage}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Badge variant={c.credit_balance <= 5 ? 'warning' : 'secondary'}>{c.credit_balance}</Badge>
                      </TableCell>
                      <TableCell>{c.country}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 md:hidden">
              {rows.map((c) => (
                <Link
                  key={c.id}
                  to={`/clinics/${c.id}`}
                  className="block rounded-xl border border-border/40 p-4 hover:bg-accent/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.name}</span>
                    <Badge variant={c.credit_balance <= 5 ? 'warning' : 'secondary'}>
                      {c.credit_balance} credits
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.suburb} · {c.stage}</p>
                </Link>
              ))}
            </div>
          </>
        )}

        {totalPages > 1 && (
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>
    </PermissionGate>
  )
}
