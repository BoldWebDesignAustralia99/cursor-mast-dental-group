import { Link, useLocation } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Monitor,
  Search,
  Sun,
} from 'lucide-react'
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
  const { preference, setPreference } = useThemePreference()
  const location = useLocation()

  const initials = profile?.full_name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/40 bg-background/80 px-4 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
      </Button>

      <button
        type="button"
        onClick={onOpenSearch}
        className={cn(
          'hidden flex-1 items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground md:flex md:max-w-md',
        )}
      >
        <Search className="size-4" />
        <span>Search…</span>
        <kbd className="ml-auto rounded border bg-background px-1.5 py-0.5 text-xs">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenSearch}>
          <Search />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Theme">
              {preference === 'dark' ? (
                <Moon />
              ) : preference === 'light' ? (
                <Sun />
              ) : (
                <Monitor />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPreference('light')}>
              <Sun className="mr-2 size-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPreference('dark')}>
              <Moon className="mr-2 size-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPreference('system')}>
              <Monitor className="mr-2 size-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" asChild>
          <Link to="/notifications" aria-label="Notifications">
            <span className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </span>
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative size-11 rounded-full p-0 md:size-9">
              <Avatar className="size-9">
                <AvatarFallback>{initials ?? '?'}</AvatarFallback>
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
