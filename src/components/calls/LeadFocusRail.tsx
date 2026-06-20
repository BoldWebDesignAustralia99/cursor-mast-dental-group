import {
  X,
  Phone,
  User,
  StickyNote,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/AuthProvider'

export type LeadRailTab = 'flow' | 'lead' | 'notes' | 'clinics'

const TABS: { id: LeadRailTab; icon: typeof Phone; label: string }[] = [
  { id: 'flow', icon: Phone, label: 'Call flow' },
  { id: 'lead', icon: User, label: 'Lead info' },
  { id: 'notes', icon: StickyNote, label: 'Notes' },
  { id: 'clinics', icon: Building2, label: 'Clinics' },
]

interface LeadFocusRailProps {
  activeTab: LeadRailTab
  onTabChange: (tab: LeadRailTab) => void
  onClose: () => void
}

export function LeadFocusRail({ activeTab, onTabChange, onClose }: LeadFocusRailProps) {
  const { profile } = useAuth()
  const initials = profile?.full_name?.split(' ').map((p) => p[0]).join('').slice(0, 2)

  return (
    <div className="flex w-12 shrink-0 flex-col items-center border-r border-border bg-sidebar py-3">
      <Button
        variant="ghost"
        size="icon"
        className="mb-3 size-8 rounded-sm text-muted-foreground hover:text-foreground"
        onClick={onClose}
        title="Close lead"
      >
        <X className="size-4" strokeWidth={1.75} />
      </Button>

      <nav className="flex flex-1 flex-col items-center gap-0.5">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <Button
              key={tab.id}
              type="button"
              variant="ghost"
              size="icon"
              title={tab.label}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'size-8 rounded-sm',
                isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
              )}
            >
              <tab.icon className="size-3.5" strokeWidth={1.75} />
            </Button>
          )
        })}
      </nav>

      <div className="mt-auto pt-2">
        <Avatar className="size-7">
          <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
}
