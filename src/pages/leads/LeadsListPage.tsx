import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, EmptyState, ErrorState } from '@/components/shared/PageStates'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { useLeadsList } from '@/hooks/useLeads'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PAGE_SIZE } from '@/lib/constants'

export function LeadsListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useLeadsList(search, null, page)
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE)
  const rows = data?.rows ?? []

  return (
    <PermissionGate permission="leads.manage">
      <div className="space-y-6">
        <PageHeader
          title="Leads"
          description="Patient leads from Facebook, webhooks, and imports"
        />

        <Input
          placeholder="Search by name, phone, or suburb…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-sm"
        />

        {isError && (
          <ErrorState message="Could not load leads." onRetry={() => void refetch()} />
        )}

        {isLoading && !isError && (
          <Skeleton className="h-64 w-full rounded-xl" />
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <EmptyState
            title={search ? 'No matching leads' : 'No leads yet'}
            description={
              search
                ? `Nothing matched "${search}". Try a different name, phone, or suburb.`
                : 'Leads from Facebook, webhooks, and imports will appear here.'
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
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Suburb</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right tabular-nums">Calls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((lead) => (
                    <TableRow key={lead.id} className="cursor-pointer">
                      <TableCell>
                        <Link to={`/leads/${lead.id}`} className="font-medium hover:underline">
                          {lead.first_name} {lead.last_name}
                        </Link>
                      </TableCell>
                      <TableCell className="tabular-nums">{lead.phone}</TableCell>
                      <TableCell>{lead.suburb}</TableCell>
                      <TableCell><Badge variant="secondary">{lead.stage}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{(lead as { source?: string }).source ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{lead.call_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 md:hidden">
              {rows.map((lead) => (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="block rounded-xl border border-border/40 p-4 hover:bg-accent/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{lead.first_name} {lead.last_name}</span>
                    <Badge variant="secondary">{lead.stage}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{lead.phone} · {lead.suburb}</p>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <PaginationControls
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </PermissionGate>
  )
}
