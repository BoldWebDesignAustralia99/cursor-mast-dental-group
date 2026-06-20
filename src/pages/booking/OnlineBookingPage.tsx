import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, addDays } from 'date-fns'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingScreen, ErrorState } from '@/components/shared/PageStates'
import { formatCurrency } from '@/lib/utils'
import { useCreateOnlineBooking, useOnlineBookingPage } from '@/hooks/useOnlineBooking'
import { useClinicAvailableSlots } from '@/hooks/useSpecFeatures'

const STEPS = ['Your details', 'Date & time', 'Confirm']

export function OnlineBookingPage() {
  const { slug = 'moorooka-implants' } = useParams()
  const { data: page, isLoading, error, refetch } = useOnlineBookingPage(slug!)
  const createBooking = useCreateOnlineBooking()

  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [selectedDate, setSelectedDate] = useState(format(addDays(new Date(), 3), 'yyyy-MM-dd'))
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const { data: slots, isLoading: slotsLoading } = useClinicAvailableSlots(page?.clinic_id, selectedDate)

  const validateStep = () => {
    const errors: Record<string, string> = {}
    if (step === 0) {
      if (!firstName.trim()) errors.firstName = 'First name is required'
      if (!lastName.trim()) errors.lastName = 'Last name is required'
      if (!phone.trim()) errors.phone = 'Mobile number is required'
    }
    if (step === 1 && !selectedSlot) errors.slot = 'Select a time slot'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep() || !selectedSlot) return

    void createBooking
      .mutateAsync({
        slug: slug!,
        firstName,
        lastName,
        phone,
        email: email || undefined,
        scheduledStart: selectedSlot.start,
        scheduledEnd: selectedSlot.end,
      })
      .then(() => {
        setConfirmed(true)
        toast.success('Your consultation is booked!')
      })
      .catch(() => toast.error('Could not complete booking'))
  }

  if (isLoading) return <LoadingScreen message="Loading booking page…" />

  if (error || !page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <ErrorState title="Booking page not found" message="This link may be inactive or incorrect." retryLabel="Try again" onRetry={() => void refetch()} className="max-w-md" />
      </div>
    )
  }

  if (confirmed && selectedSlot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md border-border/40">
          <CardContent className="space-y-4 p-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-accent-emerald" />
            <Badge variant="success">Confirmed</Badge>
            <h1 className="text-xl font-semibold">You&apos;re all set, {firstName}!</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(selectedSlot.start), 'EEEE d MMMM, h:mm a')} at {page.clinic_name}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <Badge variant="secondary">{page.suburb}</Badge>
          <h1 className="mt-2 text-2xl font-semibold">{page.title}</h1>
          <p className="text-sm text-muted-foreground">{page.description}</p>
        </div>
        <div className="flex gap-2">
          {STEPS.map((label, i) => (
            <Badge key={label} variant={i === step ? 'default' : 'outline'}>{label}</Badge>
          ))}
        </div>
        <form onSubmit={handleSubmit}>
          {step === 0 && (
            <Card className="border-border/40">
              <CardContent className="space-y-4 p-6">
                <div><Label>First name</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />{fieldErrors.firstName && <p className="text-xs text-destructive">{fieldErrors.firstName}</p>}</div>
                <div><Label>Last name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} />{fieldErrors.lastName && <p className="text-xs text-destructive">{fieldErrors.lastName}</p>}</div>
                <div><Label>Mobile</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} />{fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}</div>
                <div><Label>Email (optional)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <Button type="button" className="w-full" onClick={handleNext}>Continue</Button>
              </CardContent>
            </Card>
          )}
          {step === 1 && (
            <Card className="border-border/40">
              <CardContent className="space-y-4 p-6">
                <div><Label>Date</Label><Input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null) }} /></div>
                {slotsLoading ? <p className="text-sm text-muted-foreground">Loading available slots…</p> : (
                  <div className="grid grid-cols-2 gap-2">
                    {(slots ?? []).length === 0 ? (
                      <p className="col-span-2 text-sm text-muted-foreground">No slots available this day — try another date.</p>
                    ) : (
                      (slots ?? []).map((s) => (
                        <Button
                          key={s.slot_start}
                          type="button"
                          variant={selectedSlot?.start === s.slot_start ? 'default' : 'outline'}
                          onClick={() => setSelectedSlot({ start: s.slot_start, end: s.slot_end })}
                        >
                          {format(new Date(s.slot_start), 'h:mm a')}
                        </Button>
                      ))
                    )}
                  </div>
                )}
                {fieldErrors.slot && <p className="text-xs text-destructive">{fieldErrors.slot}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(0)}>Back</Button>
                  <Button type="button" className="flex-1" onClick={handleNext}>Continue</Button>
                </div>
              </CardContent>
            </Card>
          )}
          {step === 2 && selectedSlot && (
            <Card className="border-border/40">
              <CardHeader><CardTitle className="text-base">Confirm booking</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{firstName} {lastName} · {phone}</p>
                <p className="text-sm">{format(new Date(selectedSlot.start), 'EEEE d MMM, h:mm a')} at {page.clinic_name}</p>
                {page.deposit_cents > 0 && <p className="text-sm text-muted-foreground">Deposit: {formatCurrency(page.deposit_cents / 100)} (collected separately)</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button type="submit" className="flex-1" disabled={createBooking.isPending}>{createBooking.isPending ? 'Booking…' : 'Confirm booking'}</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
  )
}