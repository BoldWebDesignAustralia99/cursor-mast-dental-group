import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, addDays, setHours, setMinutes } from 'date-fns'
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

const TIME_SLOTS = ['09:00', '10:30', '13:00', '14:30', '16:00']
const STEPS = ['Your details', 'Date & time', 'Confirm']

export function OnlineBookingPage() {
  const { slug = 'moorooka-implants' } = useParams()
  const { data: page, isLoading, error, refetch } = useOnlineBookingPage(slug)
  const createBooking = useCreateOnlineBooking()

  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [selectedDate, setSelectedDate] = useState(format(addDays(new Date(), 3), 'yyyy-MM-dd'))
  const [selectedTime, setSelectedTime] = useState('10:30')
  const [confirmed, setConfirmed] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validateStep = () => {
    const errors: Record<string, string> = {}
    if (step === 0) {
      if (!firstName.trim()) errors.firstName = 'First name is required'
      if (!lastName.trim()) errors.lastName = 'Last name is required'
      if (!phone.trim()) errors.phone = 'Mobile number is required'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep()) return

    const [h, m] = selectedTime.split(':').map(Number)
    const start = setMinutes(setHours(new Date(selectedDate), h), m)
    const end = new Date(start.getTime() + 60 * 60_000)

    void createBooking
      .mutateAsync({
        slug,
        firstName,
        lastName,
        phone,
        email: email || undefined,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
      })
      .then(() => {
        setConfirmed(true)
        toast.success('Your consultation is booked!')
      })
      .catch(() => toast.error('Could not complete booking'))
  }

  if (isLoading) {
    return <LoadingScreen message="Loading booking page…" />
  }

  if (error || !page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <ErrorState
          title="Booking page not found"
          message="This link may be inactive or incorrect. Contact the clinic if you need help."
          retryLabel="Try again"
          onRetry={() => void refetch()}
          className="max-w-md"
        />
      </div>
    )
  }

  if (confirmed) {
    const when = format(new Date(`${selectedDate}T${selectedTime}`), 'EEEE d MMMM, h:mm a')
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md border-border/40">
          <CardContent className="space-y-4 p-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-accent-emerald" />
            <Badge variant="success">Confirmed</Badge>
            <h1 className="text-xl font-semibold">You&apos;re all set, {firstName}!</h1>
            <p className="text-sm text-muted-foreground">
              {when} at {page.clinic_name}
              {page.suburb ? `, ${page.suburb}` : ''}
            </p>
            <p className="text-sm text-muted-foreground">We&apos;ll send a confirmation SMS to {phone} shortly.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mast Dental Group</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{page.title}</h1>
          {page.description && (
            <p className="mt-2 text-sm text-muted-foreground">{page.description}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">{page.clinic_name}{page.suburb ? ` · ${page.suburb}` : ''}</p>
        </div>

        <div className="mb-6 flex justify-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                  i <= step ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </span>
              <span className={`hidden text-xs sm:inline ${i === step ? 'font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <span className="hidden h-px w-4 bg-border sm:block" />}
            </div>
          ))}
        </div>

        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-base">{STEPS[step]}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">First name</Label>
                      <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                      {fieldErrors.firstName && <p className="text-xs text-destructive">{fieldErrors.firstName}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                      {fieldErrors.lastName && <p className="text-xs text-destructive">{fieldErrors.lastName}</p>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Mobile</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <Button type="button" className="w-full" onClick={handleNext}>Continue</Button>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="date">Preferred date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred time</Label>
                    <div className="flex flex-wrap gap-2">
                      {TIME_SLOTS.map((t) => (
                        <Button
                          key={t}
                          type="button"
                          size="sm"
                          variant={selectedTime === t ? 'default' : 'outline'}
                          onClick={() => setSelectedTime(t)}
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(0)}>Back</Button>
                    <Button type="button" className="flex-1" onClick={handleNext}>Continue</Button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="rounded-lg border border-border/40 bg-muted/30 p-4 text-sm space-y-2">
                    <p><span className="text-muted-foreground">Name:</span> {firstName} {lastName}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {phone}</p>
                    <p><span className="text-muted-foreground">When:</span> {format(new Date(`${selectedDate}T${selectedTime}`), 'EEE d MMM, h:mm a')}</p>
                    <p><span className="text-muted-foreground">Where:</span> {page.clinic_name}</p>
                  </div>
                  {page.deposit_cents > 0 && (
                    <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                      A {formatCurrency(page.deposit_cents / 100)} deposit secures your appointment. Payment link sent after booking.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                    <Button type="submit" className="flex-1" disabled={createBooking.isPending}>
                      {createBooking.isPending ? 'Booking…' : 'Confirm consultation'}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
