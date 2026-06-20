import { Routes, Route } from 'react-router-dom'
import { TrainingPage } from '@/pages/training/TrainingPage'
import { TrainingBuilderPage, GradingReviewPage } from '@/pages/training/TrainingBuilderPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function TrainingRoutes() {
  return (
    <Routes>
      <Route index element={<TrainingPage />} />
      <Route path="builder" element={<TrainingBuilderPage />} />
      <Route path="grading" element={<GradingReviewPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
