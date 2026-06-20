import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type ToothStatus = 'healthy' | 'missing' | 'broken' | 'diseased'

const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

const STATUS_CYCLE: ToothStatus[] = ['healthy', 'missing', 'broken', 'diseased']

const STATUS_COLORS: Record<ToothStatus, string> = {
  healthy: 'bg-muted/40 text-muted-foreground border-border/40',
  missing: 'bg-destructive/20 text-destructive border-destructive/30',
  broken: 'bg-status-warning/20 text-status-warning border-status-warning/30',
  diseased: 'bg-accent-emerald/20 text-accent-emerald border-accent-emerald/30',
}

interface MouthMapProps {
  teeth: Record<number, ToothStatus>
  onChange: (teeth: Record<number, ToothStatus>) => void
}

function ToothRow({
  teeth,
  numbers,
  onToggle,
}: {
  teeth: Record<number, ToothStatus>
  numbers: number[]
  onToggle: (n: number) => void
}) {
  return (
    <div className="flex justify-center gap-0.5">
      {numbers.map((n, i) => {
        const status = teeth[n] ?? 'healthy'
        const isMidline = i === 7
        return (
          <Button
            key={n}
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onToggle(n)}
            className={cn(
              'size-7 rounded-sm text-[9px] font-mono tabular-nums',
              STATUS_COLORS[status],
              isMidline && 'ml-1',
            )}
            title={`Tooth ${n}: ${status}`}
          >
            {n}
          </Button>
        )
      })}
    </div>
  )
}

export function MouthMap({ teeth, onChange }: MouthMapProps) {
  const toggle = (n: number) => {
    const current = teeth[n] ?? 'healthy'
    const nextIdx = (STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length
    onChange({ ...teeth, [n]: STATUS_CYCLE[nextIdx] })
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Map the mouth
        </p>
        <div className="flex gap-2 text-[10px] text-muted-foreground">
          {(['missing', 'broken', 'diseased'] as ToothStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1 capitalize">
              <span className={cn('size-2 rounded-sm border', STATUS_COLORS[s])} />
              {s}
            </span>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Tap a tooth to cycle status</p>
      <ToothRow teeth={teeth} numbers={UPPER} onToggle={toggle} />
      <div className="mx-auto h-px w-3/4 bg-border/60" />
      <ToothRow teeth={teeth} numbers={LOWER} onToggle={toggle} />
    </div>
  )
}
