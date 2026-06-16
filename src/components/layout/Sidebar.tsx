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

const navLinkClass = (isActive: boolean, collapsed: boolean) =>
  cn(
    'flex items-center gap-2 rounded-sm px-2 py-1 text-[13px] leading-none transition-colors',
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
      : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
    collapsed ? 'justify-center px-1.5 py-1.5' : 'h-7',
  )

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
        'hidden border-r border-sidebar-border bg-sidebar md:flex md:flex-col',
        collapsed ? 'w-14' : 'w-52',
      )}
    >
      <div className="flex h-11 shrink-0 items-center border-b border-sidebar-border px-3">
        {collapsed ? (
          <span className="mx-auto text-[11px] font-bold tracking-tight">MD</span>
        ) : (
          <span className="text-[13px] font-semibold tracking-tight">Mast Dental</span>
        )}
      </div>
      <ScrollArea className="flex-1 px-1.5 py-2">
        <TooltipProvider delayDuration={0}>
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.permission || allowed.has(item.permission),
            )
            if (visibleItems.length === 0) return null

            return (
              <div key={group.label} className="mb-2 last:mb-0">
                {!collapsed && (
                  <p className="mb-0.5 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                )}
                <nav className="flex flex-col">
                  {visibleItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.href)
                    const link = (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={navLinkClass(isActive, collapsed)}
                      >
                        <item.icon className="size-3.5 shrink-0" strokeWidth={1.75} />
                        {!collapsed && <span className="truncate">{item.title}</span>}
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
