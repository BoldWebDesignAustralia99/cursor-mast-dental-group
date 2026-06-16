import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Pause,
  PhoneOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { FocusRail } from '@/components/layout/FocusRail'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  useLead,
  useCallFlowStages,
  useLeadNotes,
  useSuggestedClinics,
  useAvailableSlots,
  useAddLeadNote,
  useCreateBooking,
  DEMO_LEAD_ID,
} from '@/hooks/useLeads'

function CallTimer({ targetMinutes = 30 }: { targetMinutes?: number }) {
  const [seconds, setSeconds] = useState(310)

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const targetSecs = targetMinutes * 60
  const progress = Math.min((seconds / targetSecs) * 100, 100)

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex size-9 items-center justify-center">
        <svg className="absolute size-9 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
          <circle
            cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2"
            strokeDasharray={`${progress} 100`}
            className="text-foreground"
          />
        </svg>
      </div>
      <span className="font-mono text-sm tabular-nums text-muted-foreground">
        {mins}:{secs.toString().padStart(2, '0')}
        <span className="text-border mx-1.5">/</span>
        {targetMinutes}:00
      </span>
    </div>
  )
}

function MiniCalendar({
  selected,
  onSelect,
}: {
  selected: Date
  onSelect: (d: Date) => void
}) {
  const [viewMonth, setViewMonth] = useState(selected)

  const days = eachDayOfInterval({
    start: startOfMonth(viewMonth),
    end: endOfMonth(viewMonth),
  })
  const startPad = startOfMonth(viewMonth).getDay()

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium">{format(viewMonth, 'MMMM yyyy')}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setViewMonth(subMonths(viewMonth, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-muted-foreground mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const selectedDay = isSameDay(day, selected)
          const today = isToday(day)
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                'flex size-8 items-center justify-center rounded-md text-sm transition-colors',
                !isSameMonth(day, viewMonth) && 'text-muted-foreground/40',
                selectedDay && 'bg-foreground text-background font-medium',
                !selectedDay && today && 'ring-1 ring-border',
                !selectedDay && 'hover:bg-accent',
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function LeadRecordPage() {
  const { id = DEMO_LEAD_ID } = useParams()
  const navigate = useNavigate()
  const { data: lead, isLoading } = useLead(id)
  const { data: stages } = useCallFlowStages()
  const { data: notes } = useLeadNotes(id)
  const { data: clinics } = useSuggestedClinics(id)
  const addNote = useAddLeadNote()
  const createBooking = useCreateBooking()

  const [activeStage, setActiveStage] = useState(5)
  const [noteText, setNoteText] = useState('')
  const [muted, setMuted] = useState(false)
  const [onHold, setOnHold] = useState(false)
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 5, 17))
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  const defaultClinicId = clinics?.find((c) => c.is_recommended)?.clinic_id ?? clinics?.[0]?.clinic_id ?? ''
  const clinicId = selectedClinicId ?? defaultClinicId
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { data: slots } = useAvailableSlots(clinicId, dateStr)

  const currentStage = stages?.[activeStage]

  const handleAddNote = () => {
    if (!noteText.trim()) return
    void addNote.mutateAsync({ leadId: id, body: noteText.trim() }).then(() => {
      setNoteText('')
      toast.success('Note added')
    })
  }

  const handleBook = () => {
    if (!selectedSlot || !clinicId) {
      toast.error('Select a clinic and time slot first')
      return
    }
    const slot = slots?.find((s) => s.slot_start === selectedSlot)
    if (!slot) return

    void createBooking
      .mutateAsync({
        leadId: id,
        clinicId,
        practitionerId: 'b0000001-0000-4000-8000-000000000001',
        scheduledStart: selectedSlot,
        scheduledEnd: new Date(new Date(selectedSlot).getTime() + 60 * 60_000).toISOString(),
      })
      .then(() => {
        toast.success('Appointment booked')
        navigate('/bookings')
      })
      .catch(() => toast.error('Could not book appointment'))
  }

  if (isLoading || !lead) {
    return (
      <div className="flex h-screen bg-background">
        <FocusRail />
        <div className="flex flex-1 items-center justify-center">
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <FocusRail />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-base font-semibold tracking-tight">
                {lead.first_name} {lead.last_name}
              </h1>
              {lead.treatment_interest && (
                <Badge variant="secondary" className="shrink-0 font-normal">
                  {lead.treatment_interest}
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {lead.phone} · {lead.suburb}
            </p>
          </div>

          <CallTimer targetMinutes={30} />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className={cn('h-9 gap-2', muted && 'bg-accent')}
              onClick={() => setMuted(!muted)}
            >
              {muted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
              Mute
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn('h-9 gap-2', onHold && 'bg-accent')}
              onClick={() => setOnHold(!onHold)}
            >
              <Pause className="size-3.5" />
              Hold
            </Button>
            <Button variant="destructive" size="sm" className="h-9 gap-2">
              <PhoneOff className="size-3.5" />
              End call
            </Button>
          </div>
        </header>

        {/* 3-column body */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_1fr_320px]">
          {/* Left: call flow + lead summary */}
          <aside className="hidden border-r border-border/40 lg:flex lg:flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Call flow
                </p>
                <ol className="space-y-0.5">
                  {stages?.map((stage, i) => (
                    <li key={stage.id}>
                      <button
                        type="button"
                        onClick={() => setActiveStage(i)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                          i === activeStage
                            ? 'bg-accent'
                            : 'hover:bg-accent/50',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium',
                            i === activeStage
                              ? 'bg-foreground text-background'
                              : i < activeStage
                                ? 'bg-foreground/20 text-foreground'
                                : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">{stage.name}</p>
                          {stage.time_range && (
                            <p className="text-[11px] text-muted-foreground">{stage.time_range}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ol>

                <div className="mt-6 rounded-lg border border-border/40 p-3">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Lead
                  </p>
                  <dl className="space-y-2 text-sm">
                    {lead.treatment_interest && (
                      <div>
                        <dt className="text-muted-foreground">Wants</dt>
                        <dd>{lead.treatment_interest}</dd>
                      </div>
                    )}
                    {lead.funding_type && (
                      <div>
                        <dt className="text-muted-foreground">Funding</dt>
                        <dd>{lead.funding_type}</dd>
                      </div>
                    )}
                    {lead.decision_maker && (
                      <div>
                        <dt className="text-muted-foreground">With them</dt>
                        <dd>{lead.decision_maker}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </ScrollArea>
          </aside>

          {/* Center: script + notes */}
          <main className="flex min-w-0 flex-col border-r border-border/40">
            <div className="flex-1 overflow-auto p-5">
              {currentStage && (
                <div className="mb-6">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-[11px] font-medium text-background">
                      {activeStage + 1}
                    </span>
                    <h2 className="text-sm font-semibold">{currentStage.name}</h2>
                    {currentStage.time_range && (
                      <span className="text-xs text-muted-foreground">{currentStage.time_range}</span>
                    )}
                  </div>
                  {'script_content' in currentStage && currentStage.script_content && (
                    <div className="rounded-xl border border-border/40 bg-muted/30 p-4">
                      <p className="text-sm leading-relaxed">{currentStage.script_content}</p>
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeStage >= (stages?.length ?? 1) - 1}
                      onClick={() => setActiveStage((s) => Math.min(s + 1, (stages?.length ?? 1) - 1))}
                    >
                      Next
                    </Button>
                    <div className="flex gap-1">
                      {stages?.map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'size-1.5 rounded-full',
                            i === activeStage ? 'bg-foreground' : 'bg-border',
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Call notes
                </p>
                <div className="mb-4 flex gap-2">
                  <Input
                    placeholder="Add a note…"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                    className="h-9 bg-muted/30 border-border/40"
                  />
                  <Button size="sm" className="h-9 shrink-0" onClick={handleAddNote}>
                    Add note
                  </Button>
                </div>
                <ul className="space-y-3">
                  {notes?.map((note) => (
                    <li key={note.id} className="flex gap-3">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-border" />
                      <div>
                        <p className="text-sm leading-relaxed">{note.body}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {note.source === 'ai' ? (
                            <span className="text-status-info">AI · just now</span>
                          ) : (
                            <span>You · {format(new Date(note.created_at), 'm')} min ago</span>
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </main>

          {/* Right: clinic + calendar + slots */}
          <aside className="flex min-w-0 flex-col overflow-auto">
            <div className="p-4 space-y-5">
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Choose clinic
                </p>
                <div className="space-y-2">
                  {clinics?.map((clinic) => (
                    <button
                      key={clinic.clinic_id}
                      type="button"
                      onClick={() => setSelectedClinicId(clinic.clinic_id)}
                      className={cn(
                        'w-full rounded-xl border p-3 text-left transition-colors',
                        selectedClinicId === clinic.clinic_id || (!selectedClinicId && clinic.is_recommended)
                          ? 'border-foreground/30 bg-accent/50 ring-1 ring-foreground/10'
                          : 'border-border/40 hover:bg-accent/30',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{clinic.clinic_name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {clinic.distance_km} km · {clinic.drive_time_min} min drive
                          </p>
                        </div>
                        {clinic.is_recommended && (
                          <Badge className="shrink-0 bg-foreground text-background hover:bg-foreground/90">
                            Rec
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {clinic.has_senior && (
                          <Badge variant="success" className="text-[10px]">Senior on site</Badge>
                        )}
                        {clinic.senior_visiting && (
                          <Badge variant="warning" className="text-[10px]">Senior visiting</Badge>
                        )}
                        {!clinic.has_senior && !clinic.senior_visiting && (
                          <Badge variant="error" className="text-[10px]">No senior</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Choose a day
                </p>
                <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} />
              </div>

              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Pick a time
                </p>
                <div className="space-y-1.5">
                  {slots?.map((slot) => (
                    <button
                      key={slot.slot_start}
                      type="button"
                      onClick={() => setSelectedSlot(slot.slot_start)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors',
                        selectedSlot === slot.slot_start
                          ? 'border-foreground/30 bg-accent/50'
                          : 'border-border/40 hover:bg-accent/30',
                      )}
                    >
                      <span className="text-sm font-medium tabular-nums">{slot.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{slot.practitioner_name}</span>
                        {slot.is_senior && (
                          <Badge variant="success" className="text-[10px]">Senior</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!selectedSlot || createBooking.isPending}
                onClick={handleBook}
              >
                Book appointment
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
