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
import { ClinicsRoutes } from '@/pages/clinics/ClinicsRoutes'
import { BookingsRoutes } from '@/pages/bookings/BookingsRoutes'
import { TrainingRoutes } from '@/pages/training/TrainingRoutes'
import { TeamRoutes } from '@/pages/team/TeamRoutes'
import { AdminRoutes } from '@/pages/admin/AdminRoutes'
import {
  PortalBookingsPage,
  PortalCreditsPage,
  PortalCalendarPage,
  PortalMessagesPage,
  PortalCallingPage,
} from '@/pages/portal/PortalPages'
import { OnlineBookingPage } from '@/pages/booking/OnlineBookingPage'
import { isSupabaseConfigured } from '@/lib/demo'
import { LoadingScreen } from '@/components/shared/PageStates'

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, sessionReady } = useAuth()

  if (!isSupabaseConfigured) {
    if (!isAuthenticated) return <Navigate to="/login" replace />
    return <>{children}</>
  }

  if (!sessionReady || isLoading) return <LoadingScreen message="Checking your session…" />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/book/:slug" element={<OnlineBookingPage />} />

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
        <Route path="bookings/*" element={<BookingsRoutes />} />
        <Route path="clinics/*" element={<ClinicsRoutes />} />
        <Route path="training/*" element={<TrainingRoutes />} />
        <Route path="team/*" element={<TeamRoutes />} />
        <Route path="admin/*" element={<AdminRoutes />} />
        <Route path="portal/bookings" element={<PortalBookingsPage />} />
        <Route path="portal/calendar" element={<PortalCalendarPage />} />
        <Route path="portal/credits" element={<PortalCreditsPage />} />
        <Route path="portal/messages" element={<PortalMessagesPage />} />
        <Route path="portal/calling" element={<PortalCallingPage />} />
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
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
            <AppRoutes />
            <Toaster richColors position="top-right" />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}
