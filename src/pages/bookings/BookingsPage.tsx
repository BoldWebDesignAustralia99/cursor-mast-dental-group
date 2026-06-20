import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { PageHeader, EmptyState, ErrorState } from '@/components/shared/PageStates'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { useBookingsList } from '@/hooks/useDashboard'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PAGE_SIZE } from '@/lib/constants'

const OUTCOME_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'secondary'> = {
  showed: 'success', no_show: 'error', purchased: 'success', pending: 'secondary',
}

export function BookingsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useBookingsList(search, page)
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE)
  const rows = data?.rows ?? []

  return (
    <PermissionGate permission="bookings.view">
      <div className="space-y-6">
        <PageHeader title="Bookings" description="Appointments across all clinics" />
        <Input placeholder="Search patients…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="max-w-sm" />

        {isError && (
          <ErrorState message="Could not load bookings." onRetry={() => void refetch()} />
        )}

        {isLoading && !isError && (
          <Skeleton className="h-64 w-full rounded-xl" />
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <EmptyState
            title={search ? 'No matching bookings' : 'No bookings yet'}
            description={
              search
                ? `No appointments matched "${search}".`
                : 'Booked appointments will appear here after reps close deals on calls.'
            }
            actionLabel={search ? 'Clear search' : undefined}
            onAction={search ? () => { setSearch(''); setPage(1) } : undefined}
          />
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <>
            <div className="hidden rounded-xl border border-border/40 md:block">
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
                  {rows.map((b) => (
                    <TableRow key={b.id} className="cursor-pointer hover:bg-accent/30">
                      <TableCell className="font-medium">
                        <Link to={`/bookings/${b.id}`} className="hover:underline">
                          {b.patient_first_name} {b.patient_last_name}
                        </Link>
                      </TableCell>
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

            <div className="space-y-2 md:hidden">
              {rows.map((b) => (
                <Link
                  key={b.id}
                  to={`/bookings/${b.id}`}
                  className="block rounded-xl border border-border/40 p-4 hover:bg-accent/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{b.patient_first_name} {b.patient_last_name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{b.clinic_name}</p>
                    </div>
                    <Badge variant={OUTCOME_VARIANT[b.outcome] ?? 'secondary'}>{b.outcome}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                    {format(new Date(b.scheduled_start), 'd MMM yyyy, h:mm a')}
                  </p>
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
