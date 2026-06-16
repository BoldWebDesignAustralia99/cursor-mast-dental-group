import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageStates'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { useBookingsList } from '@/hooks/useDashboard'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { PAGE_SIZE } from '@/lib/constants'

const OUTCOME_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'secondary'> = {
  showed: 'success', no_show: 'error', purchased: 'success', pending: 'secondary',
}

export function BookingsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useBookingsList(search, page)
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE)

  return (
    <PermissionGate permission="bookings.view">
      <div className="space-y-6">
        <PageHeader title="Bookings" description="Appointments across all clinics" />
        <Input placeholder="Search patients…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="max-w-sm" />

        {isLoading ? <Skeleton className="h-64 w-full rounded-xl" /> : (
          <div className="rounded-xl border border-border/40">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Patient</TableHead>
                  <TableHead>Clinic</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Deposit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.rows.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.patient_first_name} {b.patient_last_name}</TableCell>
                    <TableCell>{b.clinic_name}</TableCell>
                    <TableCell className="tabular-nums">{format(new Date(b.scheduled_start), 'd MMM yyyy, h:mm a')}</TableCell>
                    <TableCell><Badge variant="secondary">{b.status}</Badge></TableCell>
                    <TableCell><Badge variant={OUTCOME_VARIANT[b.outcome] ?? 'secondary'}>{b.outcome}</Badge></TableCell>
                    <TableCell><Badge variant={b.deposit_status === 'paid' ? 'success' : 'secondary'}>{b.deposit_status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </PermissionGate>
  )
}
