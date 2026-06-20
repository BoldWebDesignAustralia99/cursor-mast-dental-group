import { Routes, Route } from 'react-router-dom'
import { ClinicsPage } from '@/pages/clinics/ClinicsPage'
import { ClinicPipelinePage } from '@/pages/clinics/ClinicPipelinePage'
import { ClinicDetailPage } from '@/pages/clinics/ClinicDetailPage'
import { RoutingMatrixPage, CommsInboxPage } from '@/pages/clinics/RoutingMatrixPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function ClinicsRoutes() {
  return (
    <Routes>
      <Route index element={<ClinicsPage />} />
      <Route path="pipeline" element={<ClinicPipelinePage />} />
      <Route path="inbox" element={<CommsInboxPage />} />
      <Route path="routing" element={<RoutingMatrixPage />} />
      <Route path=":id" element={<ClinicDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
