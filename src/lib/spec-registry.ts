/**
 * Canonical spec inventory — 49 tracked features from README + migrations.
 * Each item maps to a route, component, RPC, or edge function the platform must expose.
 */
export type SpecStatus = 'done' | 'partial' | 'missing'

export interface SpecItem {
  id: string
  module: string
  name: string
  /** Route path, RPC name, or edge function slug */
  anchor: string
  status: SpecStatus
}

export const SPEC_ITEMS: SpecItem[] = [
  // Auth & platform
  { id: 'auth.login', module: 'Auth', name: 'Magic link login + demo mode', anchor: '/login', status: 'done' },
  { id: 'auth.permissions', module: 'Auth', name: 'Role permission matrix', anchor: '/permissions', status: 'done' },
  { id: 'settings.rules', module: 'Settings', name: 'Business rules editor', anchor: '/settings', status: 'done' },

  // Sales core
  { id: 'sales.start_work', module: 'Sales', name: 'Start Work allocation + lead locks', anchor: 'start_work', status: 'done' },
  { id: 'sales.call_screen', module: 'Sales', name: '7-stage call screen + copilot', anchor: '/leads/:id', status: 'done' },
  { id: 'sales.call_queue', module: 'Sales', name: 'Call queue with tabs', anchor: '/calls/queue', status: 'done' },
  { id: 'sales.leads_list', module: 'Sales', name: 'Leads list + search', anchor: '/leads', status: 'done' },
  { id: 'sales.twilio', module: 'Sales', name: 'Twilio browser dialer', anchor: 'twilio-token', status: 'partial' },

  // Bookings
  { id: 'bookings.list', module: 'Bookings', name: 'Bookings list + detail', anchor: '/bookings', status: 'done' },
  { id: 'bookings.classify', module: 'Bookings', name: 'AI classification + deposit', anchor: 'classify-booking', status: 'done' },
  { id: 'bookings.online', module: 'Bookings', name: 'Public online booking', anchor: '/book/:slug', status: 'done' },
  { id: 'bookings.slots', module: 'Bookings', name: 'Availability slot engine', anchor: 'get_available_slots', status: 'done' },

  // Clinic CRM
  { id: 'clinics.list', module: 'Clinics', name: 'Clinic CRM list', anchor: '/clinics', status: 'done' },
  { id: 'clinics.detail', module: 'Clinics', name: 'Clinic detail tabs', anchor: '/clinics/:id', status: 'done' },
  { id: 'clinics.pipeline', module: 'Clinics', name: 'Pipeline kanban', anchor: '/clinics/pipeline', status: 'done' },
  { id: 'clinics.proposals', module: 'Clinics', name: 'Proposals tab', anchor: 'proposals', status: 'done' },
  { id: 'clinics.contacts', module: 'Clinics', name: 'Clinic contacts', anchor: 'clinic_contacts', status: 'done' },
  { id: 'clinics.onboarding', module: 'Clinics', name: 'Onboarding checklist toggle', anchor: 'toggle_clinic_onboarding_item', status: 'done' },
  { id: 'clinics.routing', module: 'Clinics', name: 'Routing matrix', anchor: '/clinics/routing', status: 'done' },
  { id: 'clinics.inbox', module: 'Clinics', name: 'Comms inbox + reply', anchor: '/clinics/inbox', status: 'done' },

  // Credits & billing
  { id: 'credits.ledger', module: 'Credits', name: 'Credit ledger view', anchor: 'get_clinic_ledger', status: 'done' },
  { id: 'credits.webhooks', module: 'Credits', name: 'Stripe + GoCardless webhooks', anchor: 'webhook-stripe', status: 'partial' },

  // Workflows
  { id: 'workflows.view', module: 'Workflows', name: 'Workflow viewer', anchor: '/admin/workflows', status: 'done' },
  { id: 'workflows.build', module: 'Workflows', name: 'Create/edit workflows + steps', anchor: 'workflows.build', status: 'done' },

  // Training
  { id: 'training.progress', module: 'Training', name: 'Journey progress', anchor: '/training', status: 'done' },
  { id: 'training.builder', module: 'Training', name: 'Journey builder', anchor: '/training/builder', status: 'done' },
  { id: 'training.grading', module: 'Training', name: 'Grading review queue', anchor: '/training/grading', status: 'done' },

  // Team & HR
  { id: 'team.tasks', module: 'Team', name: 'Tasks page', anchor: '/team/tasks', status: 'done' },
  { id: 'team.timesheets', module: 'Team', name: 'Timesheet clock in/out', anchor: '/team/timesheets', status: 'done' },
  { id: 'team.leave', module: 'Team', name: 'Leave requests', anchor: '/team/leave', status: 'done' },
  { id: 'team.messages', module: 'Team', name: 'Internal messaging', anchor: '/team/messages', status: 'done' },
  { id: 'team.community', module: 'Team', name: 'Community feed', anchor: '/team/community', status: 'done' },
  { id: 'team.pods', module: 'Team', name: 'Sales pods view', anchor: '/team/pods', status: 'done' },
  { id: 'team.coaching', module: 'Team', name: 'AI coaching summaries', anchor: '/team/coaching', status: 'done' },
  { id: 'team.payroll', module: 'Team', name: 'Payroll + Xero', anchor: '/team/payroll', status: 'partial' },

  // Admin & QA
  { id: 'admin.classification', module: 'Admin', name: 'Classification QA actions', anchor: '/admin/classification', status: 'done' },
  { id: 'admin.integrations', module: 'Admin', name: 'Integrations registry', anchor: '/admin/integrations', status: 'done' },
  { id: 'admin.chat', module: 'Admin', name: 'Admin AI chat', anchor: '/admin/chat', status: 'done' },
  { id: 'admin.performance', module: 'Admin', name: 'Rep performance leaderboard', anchor: '/admin/performance', status: 'done' },

  // Portal
  { id: 'portal.bookings', module: 'Portal', name: 'Portal bookings feed', anchor: '/portal/bookings', status: 'done' },
  { id: 'portal.calendar', module: 'Portal', name: 'Portal calendar availability', anchor: '/portal/calendar', status: 'done' },
  { id: 'portal.credits', module: 'Portal', name: 'Portal credits view', anchor: '/portal/credits', status: 'partial' },
  { id: 'portal.messages', module: 'Portal', name: 'Portal patient messages', anchor: '/portal/messages', status: 'done' },
  { id: 'portal.calling', module: 'Portal', name: 'Portal outbound calling', anchor: '/portal/calling', status: 'partial' },

  // Infrastructure
  { id: 'infra.notifications', module: 'Infra', name: 'Notification feed', anchor: '/notifications', status: 'done' },
  { id: 'infra.jobs', module: 'Infra', name: 'Job queue + domain events', anchor: 'process-jobs', status: 'done' },
  { id: 'infra.webhooks', module: 'Infra', name: 'Lead + payment webhooks', anchor: 'webhook-make', status: 'done' },
  { id: 'infra.cron', module: 'Infra', name: 'Scheduled maintenance jobs', anchor: 'cron_edge_workers', status: 'done' },
  { id: 'infra.ai', module: 'Infra', name: 'AI call notes + coaching', anchor: 'ai-call-notes', status: 'partial' },
]

export function specCounts() {
  const total = SPEC_ITEMS.length
  const done = SPEC_ITEMS.filter((s) => s.status === 'done').length
  const partial = SPEC_ITEMS.filter((s) => s.status === 'partial').length
  const missing = SPEC_ITEMS.filter((s) => s.status === 'missing').length
  return { total, done, partial, missing }
}

/** Spec IDs we are completing in this pass — tests assert these become done/partial→done */
export const SPEC_COMPLETION_TARGETS = [
  'clinics.proposals',
  'clinics.contacts',
  'clinics.onboarding',
  'clinics.routing',
  'clinics.inbox',
  'clinics.detail',
  'workflows.build',
  'training.builder',
  'training.grading',
  'training.progress',
  'team.timesheets',
  'team.leave',
  'team.messages',
  'team.community',
  'admin.classification',
  'bookings.online',
  'portal.calendar',
] as const
