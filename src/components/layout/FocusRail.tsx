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
import { Button } from '@/components/ui/button'
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
    <div className="flex w-12 shrink-0 flex-col items-center border-r border-border bg-sidebar py-3">
      <div className="mb-4 flex size-7 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
        MD
      </div>
      <nav className="flex flex-1 flex-col items-center gap-0.5">
        {RAIL_ITEMS.map((item) => {
          const isActive =
            item.active ||
            location.pathname.startsWith(item.href)
          return (
            <Button
              key={item.href}
              variant="ghost"
              size="icon"
              className={cn(
                'size-8 rounded-sm',
                isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
              )}
              asChild
            >
              <Link to={item.href} title={item.label}>
                <item.icon className="size-3.5" strokeWidth={1.75} />
              </Link>
            </Button>
          )
        })}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-1.5">
        <Button variant="ghost" size="icon" className="size-8 rounded-sm" asChild>
          <Link to="/settings" title="Settings">
            <Settings className="size-3.5" strokeWidth={1.75} />
          </Link>
        </Button>
        <Avatar className="size-7">
          <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
}
