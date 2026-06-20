import { Routes, Route } from 'react-router-dom'
import { AdminChatPage } from '@/pages/admin/AdminChatPage'
import { IntegrationsPage, PerformanceDashboardPage } from '@/pages/admin/IntegrationsPage'
import { WorkflowBuilderPage } from '@/pages/admin/WorkflowBuilderPage'
import { ClassificationReviewsPage } from '@/pages/admin/ClassificationReviewsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function AdminRoutes() {
  return (
    <Routes>
      <Route path="chat" element={<AdminChatPage />} />
      <Route path="integrations" element={<IntegrationsPage />} />
      <Route path="performance" element={<PerformanceDashboardPage />} />
      <Route path="workflows" element={<WorkflowBuilderPage />} />
      <Route path="classification" element={<ClassificationReviewsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
