import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { getNavigationForRole } from '@/lib/navigation'
import { useMyPermissions } from '@/hooks/usePermissions'
import type { UserRole } from '@/lib/constants'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface SidebarProps {
  role: UserRole
  collapsed: boolean
}

export function Sidebar({ role, collapsed }: SidebarProps) {
  const location = useLocation()
  const { data: permissions } = useMyPermissions()
  const allowed = new Set(
    permissions?.filter((p) => p.allowed).map((p) => p.permission_key) ?? [],
  )

  const navGroups = getNavigationForRole(role)

  return (
    <aside
      className={cn(
        'hidden border-r bg-sidebar md:flex md:flex-col',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        {collapsed ? (
          <span className="mx-auto text-sm font-bold">MD</span>
        ) : (
          <span className="text-sm font-semibold">Mast Dental Group</span>
        )}
      </div>
      <ScrollArea className="flex-1 px-2 py-4">
        <TooltipProvider delayDuration={0}>
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.permission || allowed.has(item.permission),
            )
            if (visibleItems.length === 0) return null

            return (
              <div key={group.label} className="mb-4">
                {!collapsed && (
                  <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                    {group.label}
                  </p>
                )}
                <nav className="space-y-1">
                  {visibleItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.href)
                    const link = (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors min-h-11',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                          collapsed && 'justify-center px-2',
                        )}
                      >
                        <item.icon className="size-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    )

                    if (collapsed) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right">{item.title}</TooltipContent>
                        </Tooltip>
                      )
                    }

                    return link
                  })}
                </nav>
              </div>
            )
          })}
        </TooltipProvider>
      </ScrollArea>
    </aside>
  )
}
