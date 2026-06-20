import { useEffect, useState, useCallback } from 'react'
import { Sparkles, MoreHorizontal, PhoneOff } from 'lucide-react'
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
} from 'lucide-react'
import { toast } from 'sonner'
import { FocusRail } from '@/components/layout/FocusRail'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shared/PageStates'
import { cn } from '@/lib/utils'
import { LiveCopilotPanel } from '@/components/calls/LiveCopilotPanel'
import { StageActionPanel } from '@/components/calls/StageActionPanel'
import { useTwilioCall } from '@/hooks/useTwilioCall'
import { useLiveTranscript } from '@/hooks/useLiveTranscript'
import { useCopilotCues } from '@/hooks/useCopilot'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { isDemoModeEnabled } from '@/lib/demo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLeadLock } from '@/hooks/useStartWork'
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

function CallTimer({ isLive, targetMinutes = 30 }: { isLive: boolean; targetMinutes?: number }) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [isLive])

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
            <Button
              key={day.toISOString()}
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onSelect(day)}
              className={cn(
                'size-8 rounded-sm text-sm font-normal',
                !isSameMonth(day, viewMonth) && 'text-muted-foreground/40',
                selectedDay && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                !selectedDay && today && 'ring-1 ring-border',
              )}
            >
              {format(day, 'd')}
            </Button>
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
  const leadLock = useLeadLock(id)

  const [activeStage, setActiveStage] = useState(0)
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set())
  const [noteText, setNoteText] = useState('')
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [copilotOpen, setCopilotOpen] = useState(true)
  const [lockHeld, setLockHeld] = useState(false)

  const call = useTwilioCall({
    leadId: id,
    phoneNumber: lead?.phone ?? '',
  })
  const transcript = useLiveTranscript(id, call.callLogId, copilotOpen)
  const { data: cues, isLoading: cuesLoading } = useCopilotCues(transcript.lines)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    if (isDemoModeEnabled()) return
    void (supabase as any).rpc('can_access_lead', { p_lead_id: id }).then(({ data, error }: { data: boolean; error: Error | null }) => {
      if (error || data === false) setAccessDenied(true)
    })
  }, [id])

  useEffect(() => {
    if (!lockHeld || !lead?.phone) return
    void call.connect()
  }, [lockHeld, lead?.phone])

  const releaseAndNavigate = useCallback(
    async (path: string, reason: string) => {
      if (lockHeld) await leadLock.release(reason)
      navigate(path)
    },
    [leadLock, lockHeld, navigate],
  )

  useEffect(() => {
    let cancelled = false
    void leadLock.acquire().then((ok) => {
      if (!cancelled) {
        setLockHeld(ok)
        if (!ok) toast.error('Another rep is working this lead')
      }
    })
    return () => {
      cancelled = true
      void leadLock.release('page_close')
    }
  }, [id])

  useEffect(() => {
    if (!lockHeld) return
    const interval = setInterval(() => {
      void leadLock.heartbeat()
    }, 60_000)
    return () => clearInterval(interval)
  }, [lockHeld, leadLock])

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
      .then(async () => {
        toast.success('Appointment booked')
        await leadLock.release('booked')
        navigate('/bookings')
      })
      .catch(() => toast.error('Could not book appointment'))
  }

  const advanceStage = () => {
    setCompletedStages((prev) => new Set(prev).add(activeStage))
    setActiveStage((s) => Math.min(s + 1, (stages?.length ?? 1) - 1))
  }

  const jumpToStage = (index: number) => {
    setActiveStage(index)
  }

  const handleEndCall = () => {
    const transcriptText = transcript.lines.map((l) => `${l.speaker}: ${l.text}`).join('\n')
    call.hangUp()
    if (call.callLogId && transcriptText) {
      void (supabase as any).rpc('end_call_log', {
        p_call_log_id: call.callLogId,
        p_transcript: transcriptText,
      })
      void api.aiCallNotes(call.callLogId, transcriptText).catch(() => {
        /* demo / missing AI key */
      })
    }
  }

  if (accessDenied) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <ErrorState
          title="Lead not in your pod"
          message="This lead belongs to another sales pod. Use Start Work on the dashboard to get your next allocated lead."
          retryLabel="Back to dashboard"
          onRetry={() => navigate('/dashboard')}
          className="max-w-md"
        />
      </div>
    )
  }

  if (isLoading || !lead) {
    return (
      <div className="flex h-screen bg-background">
        <FocusRail />
        <div className="flex flex-1 flex-col gap-4 p-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48" />
          <div className="grid flex-1 gap-4 lg:grid-cols-3">
            <Skeleton className="hidden lg:block" />
            <Skeleton className="lg:col-span-1" />
            <Skeleton className="hidden lg:block" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <FocusRail />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex shrink-0 flex-col gap-3 border-b border-border/40 px-4 py-3 sm:px-5 lg:h-14 lg:flex-row lg:items-center lg:justify-between lg:py-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-base font-semibold tracking-tight">
                {lead.first_name} {lead.last_name}
              </h1>
              {lead.treatment_interest && (
                <Badge variant="secondary" className="hidden shrink-0 font-normal sm:inline-flex">
                  {lead.treatment_interest}
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {lead.phone} · {lead.suburb}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 lg:justify-end">
            <CallTimer isLive={call.isLive} targetMinutes={30} />

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                onClick={() => setCopilotOpen(true)}
              >
                <Sparkles className="size-3.5" />
                <span className="hidden sm:inline">Copilot</span>
              </Button>
              <Button variant="destructive" size="sm" className="h-9 gap-2" onClick={handleEndCall}>
                <PhoneOff className="size-3.5" />
                <span className="hidden sm:inline">End call</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="size-9">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => call.toggleMute()}>
                    {call.muted ? 'Unmute' : 'Mute'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => call.toggleHold()}>
                    {call.onHold ? 'Resume' : 'Hold'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => void releaseAndNavigate('/dashboard', 'next_lead')}
                  >
                    Next lead
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => void releaseAndNavigate('/dashboard', 'leave')}
                  >
                    Leave record
                  </DropdownMenuItem>
                  {stages?.map((stage, i) => (
                    <DropdownMenuItem key={stage.id} onClick={() => jumpToStage(i)}>
                      Jump to {stage.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setActiveStage(i)}
                        className={cn(
                          'h-auto w-full items-start justify-start gap-3 rounded-sm px-2 py-1.5 text-left font-normal',
                          i === activeStage && 'bg-accent',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium',
                            completedStages.has(i)
                              ? 'bg-accent-emerald text-accent-emerald-foreground'
                              : i === activeStage
                                ? 'bg-foreground text-background'
                                : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {completedStages.has(i) ? '✓' : i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">{stage.name}</p>
                          {stage.time_range && (
                            <p className="text-[11px] text-muted-foreground">{stage.time_range}</p>
                          )}
                        </div>
                      </Button>
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
                      onClick={advanceStage}
                    >
                      Next stage
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

          {/* Right: stage-specific action panel */}
          <aside className="flex min-w-0 flex-col overflow-auto">
            <div className="p-4">
              <StageActionPanel
                stageName={currentStage?.name ?? ''}
                clinics={clinics}
                slots={slots}
                selectedClinicId={selectedClinicId ?? defaultClinicId}
                selectedSlot={selectedSlot}
                selectedDate={selectedDate}
                onSelectClinic={setSelectedClinicId}
                onSelectSlot={setSelectedSlot}
                onBook={handleBook}
                bookingPending={createBooking.isPending}
                calendar={
                  <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} />
                }
              />
            </div>
          </aside>
        </div>
      </div>
      <LiveCopilotPanel
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        lines={transcript.lines}
        cues={cues ?? []}
        cuesLoading={cuesLoading}
        connected={transcript.connected}
        isLive={call.isLive}
      />
    </div>
  )
}
