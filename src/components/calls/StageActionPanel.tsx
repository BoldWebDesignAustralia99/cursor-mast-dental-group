import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { MouthMap } from '@/components/calls/MouthMap'

interface StageActionPanelProps {
  stageName: string
}

const OBJECTIONS = [
  { q: 'Too expensive', a: 'The consult includes $395 worth of scans and design — the $75 deposit secures that.' },
  { q: 'Need to think about it', a: 'Totally understand. What specific concern can I address right now?' },
  { q: 'Already got a quote', a: 'Great — our consult gives you a second opinion with 3D imaging at no extra cost beyond the deposit.' },
]

export function StageActionPanel({ stageName }: StageActionPanelProps) {
  const [teeth, setTeeth] = useState<Record<number, 'healthy' | 'missing' | 'broken' | 'diseased'>>({})
  const [income, setIncome] = useState('')
  const [funding, setFunding] = useState<string[]>([])

  const normalized = stageName.toLowerCase()

  if (normalized.includes('open')) {
    return (
      <div className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Common objections
        </p>
        {OBJECTIONS.map((o) => (
          <div key={o.q} className="rounded-lg border border-border/40 p-3">
            <p className="text-sm font-medium">{o.q}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{o.a}</p>
          </div>
        ))}
      </div>
    )
  }

  if (normalized.includes('discover')) {
    return <MouthMap teeth={teeth} onChange={setTeeth} />
  }

  if (normalized.includes('educate')) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <p className="text-sm font-medium mb-2">All-on-X</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Full arch restoration on 4–6 implants. Fixed teeth same day in many cases.
          </p>
          <Button variant="outline" size="sm" className="mt-3 w-full text-xs">
            SMS before/after photos
          </Button>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <p className="text-sm font-medium mb-2">Multiple implants</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Replace several missing teeth with individual implant crowns.
          </p>
          <Button variant="outline" size="sm" className="mt-3 w-full text-xs">
            SMS implant guide
          </Button>
        </div>
      </div>
    )
  }

  if (normalized.includes('finance')) {
    const eligible = income && Number(income.replace(/\D/g, '')) >= 75000
    return (
      <div className="space-y-4 rounded-xl border border-border/40 bg-card/50 p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Finance check
        </p>
        <div className="space-y-2">
          <Label htmlFor="income" className="text-xs">Household income (annual)</Label>
          <Input
            id="income"
            placeholder="$75,000+"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="h-9 bg-muted/30"
          />
        </div>
        {income && (
          <Badge variant={eligible ? 'success' : 'error'}>
            {eligible ? 'Likely eligible' : 'Below threshold'}
          </Badge>
        )}
        <div className="space-y-2">
          <p className="text-xs font-medium">Funding methods</p>
          {['savings', 'super', 'finance'].map((f) => (
            <label key={f} className="flex items-center gap-2 text-sm capitalize">
              <Checkbox
                checked={funding.includes(f)}
                onCheckedChange={(checked) =>
                  setFunding((prev) =>
                    checked ? [...prev, f] : prev.filter((x) => x !== f),
                  )
                }
              />
              {f}
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (normalized.includes('deposit')) {
    return (
      <div className="space-y-3 rounded-xl border border-border/40 bg-card/50 p-4">
        <p className="text-sm font-medium">$75 holding deposit</p>
        <p className="text-xs text-muted-foreground">
          Secures the consult including 3D scan, OPG, and smile preview.
        </p>
        <Button className="w-full bg-accent-emerald text-accent-emerald-foreground hover:bg-accent-emerald/90">
          Take card payment
        </Button>
        <Button variant="outline" className="w-full">
          Send payment link via SMS
        </Button>
      </div>
    )
  }

  if (normalized.includes('sell')) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/50 p-4">
        <p className="text-sm font-medium">Dr Evelyn Chin</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Implant specialist · 15+ years · All-on-X certified
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Use the Clinics tab on the left rail to compare locations before booking.
        </p>
      </div>
    )
  }

  if (normalized.includes('book')) {
    return (
      <p className="text-sm text-muted-foreground">
        Use the booking panel on the right to choose clinic, date, and time.
      </p>
    )
  }

  return (
    <p className="text-sm text-muted-foreground">
      Follow the script in the centre panel for this stage.
    </p>
  )
}
