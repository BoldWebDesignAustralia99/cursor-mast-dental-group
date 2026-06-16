import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/providers/QueryProvider'
import { AuthProvider, useAuth } from '@/providers/AuthProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { PermissionsPage } from '@/pages/permissions/PermissionsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { CallQueuePage } from '@/pages/leads/CallQueuePage'
import { LeadsListPage } from '@/pages/leads/LeadsListPage'
import { LeadRecordPage } from '@/pages/leads/LeadRecordPage'
import { BookingsPage } from '@/pages/bookings/BookingsPage'
import { ClinicsPage } from '@/pages/clinics/ClinicsPage'
import { TrainingPage } from '@/pages/training/TrainingPage'
import { TeamPage } from '@/pages/team/TeamPage'
import {
  PortalBookingsPage,
  PortalCreditsPage,
  PortalCalendarPage,
} from '@/pages/portal/PortalPages'
import { isSupabaseConfigured } from '@/lib/demo'

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, sessionReady } = useAuth()

  if (!isSupabaseConfigured) {
    if (!isAuthenticated) return <Navigate to="/login" replace />
    return <>{children}</>
  }

  if (!sessionReady || isLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Focused lead record — no app shell sidebar */}
      <Route
        path="/leads/:id"
        element={
          <AuthRedirect>
            <LeadRecordPage />
          </AuthRedirect>
        }
      />

      <Route
        element={
          <AuthRedirect>
            <AppShell />
          </AuthRedirect>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="calls/queue" element={<CallQueuePage />} />
        <Route path="leads" element={<LeadsListPage />} />
        <Route path="bookings/*" element={<BookingsPage />} />
        <Route path="clinics/*" element={<ClinicsPage />} />
        <Route path="training/*" element={<TrainingPage />} />
        <Route path="team/*" element={<TeamPage />} />
        <Route path="portal/bookings" element={<PortalBookingsPage />} />
        <Route path="portal/calendar" element={<PortalCalendarPage />} />
        <Route path="portal/credits" element={<PortalCreditsPage />} />
        <Route path="portal/*" element={<PortalBookingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster richColors position="top-right" />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}
