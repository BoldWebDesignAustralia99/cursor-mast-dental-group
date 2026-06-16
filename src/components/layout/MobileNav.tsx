import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { getMobileTabs } from '@/lib/navigation'
import { useMyPermissions } from '@/hooks/usePermissions'
import type { UserRole } from '@/lib/constants'

interface MobileNavProps {
  role: UserRole
}

export function MobileNav({ role }: MobileNavProps) {
  const location = useLocation()
  const { data: permissions } = useMyPermissions()
  const allowed = new Set(
    permissions?.filter((p) => p.allowed).map((p) => p.permission_key) ?? [],
  )
  const tabs = getMobileTabs(role, allowed)

  if (tabs.length === 0) return null

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((tab) => {
          const isActive = location.pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-xs',
                isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
              )}
            >
              <tab.icon className="size-5" />
              <span className="truncate">{tab.title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
