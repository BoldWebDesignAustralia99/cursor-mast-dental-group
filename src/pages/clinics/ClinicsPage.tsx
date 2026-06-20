import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageStates'
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
  const { data, isLoading } = useClinicsList(stage, page)
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE)

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

        {isLoading ? <Skeleton className="h-64 w-full rounded-xl" /> : (
          <div className="rounded-xl border border-border/40">
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
                {data?.rows.map((c) => (
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
        )}

        {totalPages > 1 && (
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>
    </PermissionGate>
  )
}
