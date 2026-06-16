import { Link, useLocation } from 'react-router-dom'
import { Bell, ChevronLeft, ChevronRight, Moon, Search, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/providers/AuthProvider'
import { useThemePreference } from '@/providers/ThemeProvider'
import { signOut } from '@/hooks/useAuth'
import { ROLE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface TopBarProps {
  onToggleSidebar: () => void
  sidebarCollapsed: boolean
  onOpenSearch: () => void
}

export function TopBar({
  onToggleSidebar,
  sidebarCollapsed,
  onOpenSearch,
}: TopBarProps) {
  const { profile } = useAuth()
  const { isDark, setDarkMode } = useThemePreference()
  const location = useLocation()

  const initials = profile?.full_name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-11 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={onOpenSearch}
        className={cn(
          'hidden h-8 flex-1 items-center justify-start gap-2 px-3 text-sm font-normal text-muted-foreground md:flex md:max-w-sm',
        )}
      >
        <Search className="size-3.5 shrink-0" />
        <span>Search…</span>
        <kbd className="pointer-events-none ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium lg:inline-block">
          ⌘K
        </kbd>
      </Button>

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="size-8 md:hidden" onClick={onOpenSearch}>
          <Search className="size-4" />
        </Button>

        <div className="hidden items-center gap-1.5 rounded-md border border-border px-2 py-1 sm:flex">
          <Sun className="size-3.5 text-muted-foreground" aria-hidden />
          <Switch
            id="theme-toggle"
            checked={isDark}
            onCheckedChange={setDarkMode}
            aria-label="Toggle dark mode"
            className="scale-90"
          />
          <Moon className="size-3.5 text-muted-foreground" aria-hidden />
          <Label htmlFor="theme-toggle" className="sr-only">
            Dark mode
          </Label>
        </div>

        <Button variant="ghost" size="icon" className="size-8 sm:hidden" asChild>
          <Link to="/profile" aria-label="Theme settings">
            {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </Link>
        </Button>

        <Button variant="ghost" size="icon" className="size-8" asChild>
          <Link to="/notifications" aria-label="Notifications">
            <Bell className="size-4" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative size-8 rounded-full p-0">
              <Avatar className="size-8">
                <AvatarFallback className="text-[10px]">{initials ?? '?'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
                {profile?.role && (
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[profile.role]}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">Profile settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void signOut().then(() => {
                  window.location.href = '/login'
                })
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <span className="sr-only">Current page: {location.pathname}</span>
    </header>
  )
}
