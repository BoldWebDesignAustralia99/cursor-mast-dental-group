import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  LayoutDashboard,
  MessageSquare,
  Phone,
  Settings,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/providers/AuthProvider'

const RAIL_ITEMS = [
  { icon: Home, href: '/dashboard', label: 'Home' },
  { icon: Phone, href: '/calls/queue', label: 'Calls', active: true },
  { icon: LayoutDashboard, href: '/leads', label: 'Leads' },
  { icon: MessageSquare, href: '/team/messages', label: 'Messages' },
  { icon: Wallet, href: '/clinics', label: 'Clinics' },
]

export function FocusRail() {
  const location = useLocation()
  const { profile } = useAuth()
  const initials = profile?.full_name?.split(' ').map((p) => p[0]).join('').slice(0, 2)

  return (
    <div className="flex w-14 shrink-0 flex-col items-center border-r border-border/40 bg-background py-4">
      <div className="mb-6 flex size-8 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold">
        MD
      </div>
      <nav className="flex flex-1 flex-col items-center gap-1">
        {RAIL_ITEMS.map((item) => {
          const isActive =
            item.active ||
            location.pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              to={item.href}
              title={item.label}
              className={cn(
                'flex size-11 items-center justify-center rounded-lg transition-colors',
                isActive
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <item.icon className="size-[18px]" strokeWidth={1.75} />
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-2">
        <Link
          to="/settings"
          className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        >
          <Settings className="size-[18px]" strokeWidth={1.75} />
        </Link>
        <Avatar className="size-8">
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
}
