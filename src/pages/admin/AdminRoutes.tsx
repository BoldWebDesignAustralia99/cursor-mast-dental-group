import { Routes, Route } from 'react-router-dom'
import { AdminChatPage } from '@/pages/admin/AdminChatPage'
import { IntegrationsPage, PerformanceDashboardPage } from '@/pages/admin/IntegrationsPage'

export function AdminRoutes() {
  return (
    <Routes>
      <Route path="chat" element={<AdminChatPage />} />
      <Route path="integrations" element={<IntegrationsPage />} />
      <Route path="performance" element={<PerformanceDashboardPage />} />
    </Routes>
  )
}
