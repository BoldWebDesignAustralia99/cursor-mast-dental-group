import { Routes, Route } from 'react-router-dom'
import { TeamPage } from '@/pages/team/TeamPage'
import { MessagesPage, CommunityPage, TimesheetPage, LeavePage, PayrollPage } from '@/pages/team/MessagesPage'

export function TeamRoutes() {
  return (
    <Routes>
      <Route index element={<TeamPage />} />
      <Route path="messages" element={<MessagesPage />} />
      <Route path="community" element={<CommunityPage />} />
      <Route path="timesheets" element={<TimesheetPage />} />
      <Route path="leave" element={<LeavePage />} />
      <Route path="payroll" element={<PayrollPage />} />
    </Routes>
  )
}
