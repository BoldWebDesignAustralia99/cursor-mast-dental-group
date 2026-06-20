import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, addDays, setHours, setMinutes } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { useCreateOnlineBooking, useOnlineBookingPage } from '@/hooks/useOnlineBooking'

const TIME_SLOTS = ['09:00', '10:30', '13:00', '14:30', '16:00']

export function OnlineBookingPage() {
  const { slug = 'moorooka-implants' } = useParams()
  const { data: page, isLoading, error } = useOnlineBookingPage(slug)
  const createBooking = useCreateOnlineBooking()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [selectedDate, setSelectedDate] = useState(format(addDays(new Date(), 3), 'yyyy-MM-dd'))
  const [selectedTime, setSelectedTime] = useState('10:30')
  const [confirmed, setConfirmed] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName || !phone) {
      toast.error('Please fill in your details')
      return
    }

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
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Skeleton className="h-96 w-full max-w-lg" />
      </div>
    )
  }

  if (error || !page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md border-border/40">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-medium">Booking page not found</p>
            <p className="mt-2 text-sm text-muted-foreground">This link may be inactive or incorrect.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (confirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md border-border/40">
          <CardContent className="space-y-4 p-8 text-center">
            <Badge variant="success" className="mx-auto">Confirmed</Badge>
            <h1 className="text-xl font-semibold">You&apos;re all set, {firstName}!</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(`${selectedDate}T${selectedTime}`), 'EEEE d MMMM, h:mm a')} at {page.clinic_name}
              {page.suburb ? `, ${page.suburb}` : ''}
            </p>
            <p className="text-sm text-muted-foreground">We&apos;ll send a confirmation SMS shortly.</p>
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

        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-base">Your details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Mobile</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email (optional)</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

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

              {page.deposit_cents > 0 && (
                <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  A {formatCurrency(page.deposit_cents / 100)} deposit secures your appointment. Payment link sent after booking.
                </p>
              )}

              <Button type="submit" className="w-full" disabled={createBooking.isPending}>
                {createBooking.isPending ? 'Booking…' : 'Confirm consultation'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
