import { Routes, Route } from 'react-router-dom'
import { BookingsPage } from '@/pages/bookings/BookingsPage'
import { BookingDetailPage } from '@/pages/bookings/BookingDetailPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function BookingsRoutes() {
  return (
    <Routes>
      <Route index element={<BookingsPage />} />
      <Route path=":id" element={<BookingDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
