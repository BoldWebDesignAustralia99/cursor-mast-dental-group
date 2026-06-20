import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SuggestedClinic, TimeSlot } from '@/hooks/useLeads'

interface BookingPanelProps {
  clinics?: SuggestedClinic[]
  slots?: TimeSlot[]
  selectedClinicId: string | null
  selectedSlot: string | null
  onSelectClinic: (id: string) => void
  onSelectSlot: (slot: string) => void
  onBook: () => void
  bookingPending?: boolean
  calendar: React.ReactNode
}

function ClinicCard({
  clinic,
  selected,
  onSelect,
}: {
  clinic: SuggestedClinic
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-lg border p-3 text-left transition-colors',
        selected
          ? 'border-accent-emerald/50 bg-accent-emerald/10 ring-1 ring-accent-emerald/25'
          : 'border-border/40 bg-card/30 hover:bg-accent/20',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{clinic.clinic_name}</p>
          <p className="text-xs text-muted-foreground">{clinic.suburb}</p>
        </div>
        {clinic.is_recommended && (
          <Badge variant="success" className="shrink-0 text-[10px]">Rec</Badge>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-xs tabular-nums text-muted-foreground">
          {clinic.distance_km} km · {clinic.drive_time_min} min drive
        </span>
        {clinic.has_senior ? (
          <Badge variant="success" className="text-[10px]">Senior on site</Badge>
        ) : clinic.senior_visiting ? (
          <Badge variant="warning" className="text-[10px]">Senior visiting</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">No senior</Badge>
        )}
        <Badge variant="outline" className="text-[10px] tabular-nums">
          {clinic.credit_balance} credits
        </Badge>
      </div>
    </button>
  )
}

export function BookingPanel({
  clinics,
  slots,
  selectedClinicId,
  selectedSlot,
  onSelectClinic,
  onSelectSlot,
  onBook,
  bookingPending,
  calendar,
}: BookingPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto pr-1">
        <section>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Choose clinic
          </h3>
          <div className="space-y-2">
            {(clinics ?? []).map((clinic) => (
              <ClinicCard
                key={clinic.clinic_id}
                clinic={clinic}
                selected={selectedClinicId === clinic.clinic_id}
                onSelect={() => onSelectClinic(clinic.clinic_id)}
              />
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Choose a day
          </h3>
          <div className="rounded-lg border border-border/40 bg-card/20 p-3">
            {calendar}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Pick a time
          </h3>
          {(slots ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/40 p-4 text-center text-xs text-muted-foreground">
              No slots on this day — try another date or clinic.
            </p>
          ) : (
            <div className="space-y-1.5">
              {slots?.map((slot) => (
                <button
                  key={slot.slot_start}
                  type="button"
                  onClick={() => onSelectSlot(slot.slot_start)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors',
                    selectedSlot === slot.slot_start
                      ? 'border-accent-emerald/50 bg-accent-emerald/10'
                      : 'border-border/40 hover:bg-accent/20',
                  )}
                >
                  <span className="text-sm font-medium tabular-nums">{slot.label}</span>
                  <span className="text-xs text-muted-foreground">{slot.practitioner_name}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="shrink-0 border-t border-border/40 bg-background pt-3">
        <Button
          className="w-full bg-accent-emerald text-accent-emerald-foreground hover:bg-accent-emerald/90"
          disabled={!selectedSlot || bookingPending}
          onClick={onBook}
        >
          {bookingPending ? 'Booking…' : 'Book appointment'}
        </Button>
      </div>
    </div>
  )
}
