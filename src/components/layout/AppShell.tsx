import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import { CommandSearch } from '@/components/layout/CommandSearch'
import { useAuth } from '@/providers/AuthProvider'
import { Skeleton } from '@/components/ui/skeleton'

export function AppShell() {
  const { profile, isLoading } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  if (isLoading || !profile) {
    return (
      <div className="flex min-h-screen">
        <Skeleton className="hidden w-52 md:block" />
        <div className="flex flex-1 flex-col">
          <Skeleton className="h-11 w-full" />
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={profile.role} collapsed={sidebarCollapsed} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
          onOpenSearch={() => setSearchOpen(true)}
        />
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
          <Outlet />
        </main>
        <MobileNav role={profile.role} />
      </div>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
