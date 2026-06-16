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
import { PlaceholderPage } from '@/pages/PlaceholderPage'

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
        <Route
          path="calls/queue"
          element={
            <PlaceholderPage
              title="Call queue"
              description="Your main calling screen with configurable tabs and one-click actions"
              permission="calls.queue.view"
            />
          }
        />
        <Route
          path="leads/*"
          element={
            <PlaceholderPage
              title="Leads"
              description="Patient lead records, assignment, and timeline"
              permission="leads.view"
            />
          }
        />
        <Route
          path="bookings/*"
          element={
            <PlaceholderPage
              title="Bookings"
              description="Appointment booking, rescheduling, and outcomes"
              permission="bookings.view"
            />
          }
        />
        <Route
          path="clinics/*"
          element={
            <PlaceholderPage
              title="Clinic CRM"
              description="Pipeline, proposals, onboarding, and billing"
              permission="clinics.view"
            />
          }
        />
        <Route
          path="training/*"
          element={
            <PlaceholderPage
              title="Training"
              description="Journeys, stages, and practice calls"
              permission="training.view"
            />
          }
        />
        <Route
          path="team/*"
          element={
            <PlaceholderPage
              title="Team & HR"
              description="Timesheets, leave, payroll, tasks, and messages"
              permission="team.view"
            />
          }
        />
        <Route
          path="portal/*"
          element={
            <PlaceholderPage
              title="Clinic portal"
              description="Bookings, calendar, credits, and messages for clinic staff"
              permission="portal.bookings.view"
            />
          }
        />
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
