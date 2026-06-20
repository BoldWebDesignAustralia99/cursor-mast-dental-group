import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  Building2,
  Calendar,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Phone,
  Settings,
  Shield,
  Users,
  Wallet,
} from 'lucide-react'
import type { UserRole } from '@/lib/constants'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  permission?: string
  mobileTab?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

const internalNav: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        permission: 'dashboard.view',
        mobileTab: true,
      },
    ],
  },
  {
    label: 'Sales',
    items: [
      {
        title: 'Call queue',
        href: '/calls/queue',
        icon: Phone,
        permission: 'calls.queue.view',
        mobileTab: true,
      },
      {
        title: 'Leads',
        href: '/leads',
        icon: Users,
        permission: 'leads.view',
      },
      {
        title: 'Bookings',
        href: '/bookings',
        icon: Calendar,
        permission: 'bookings.view',
      },
    ],
  },
  {
    label: 'Clinics',
    items: [
      {
        title: 'Clinic CRM',
        href: '/clinics',
        icon: Building2,
        permission: 'clinics.view',
        mobileTab: true,
      },
      {
        title: 'Routing matrix',
        href: '/clinics/routing',
        icon: Building2,
        permission: 'leads.manage',
      },
      {
        title: 'Comms inbox',
        href: '/clinics/inbox',
        icon: MessageSquare,
        permission: 'clinics.comms.view',
      },
    ],
  },
  {
    label: 'Team',
    items: [
      {
        title: 'Training',
        href: '/training',
        icon: GraduationCap,
        permission: 'training.view',
      },
      {
        title: 'Team & HR',
        href: '/team',
        icon: ClipboardList,
        permission: 'team.view',
      },
      {
        title: 'Sales pods',
        href: '/team/pods',
        icon: Users,
        permission: 'team.manage',
      },
      {
        title: 'Coaching',
        href: '/team/coaching',
        icon: GraduationCap,
        permission: 'team.view',
      },
    ],
  },
  {
    label: 'Admin',
    items: [
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        permission: 'settings.view',
      },
      {
        title: 'Workflows',
        href: '/admin/workflows',
        icon: Settings,
        permission: 'workflows.view',
      },
      {
        title: 'Classification QA',
        href: '/admin/classification',
        icon: Shield,
        permission: 'bookings.view',
      },
      {
        title: 'Integrations',
        href: '/admin/integrations',
        icon: Settings,
        permission: 'integrations.manage',
      },
      {
        title: 'AI chat',
        href: '/admin/chat',
        icon: MessageSquare,
        permission: 'ai.admin_chat',
      },
      {
        title: 'Performance',
        href: '/admin/performance',
        icon: LayoutDashboard,
        permission: 'dashboard.view',
      },
      {
        title: 'Permissions',
        href: '/permissions',
        icon: Shield,
        permission: 'permissions.manage',
      },
      {
        title: 'Notifications',
        href: '/notifications',
        icon: Bell,
        permission: 'notifications.view',
        mobileTab: true,
      },
    ],
  },
]

const clinicNav: NavGroup[] = [
  {
    label: 'Portal',
    items: [
      {
        title: 'Bookings',
        href: '/portal/bookings',
        icon: Calendar,
        permission: 'portal.bookings.view',
        mobileTab: true,
      },
      {
        title: 'Calendar',
        href: '/portal/calendar',
        icon: ClipboardList,
        permission: 'portal.calendar.manage',
        mobileTab: true,
      },
      {
        title: 'Credits',
        href: '/portal/credits',
        icon: Wallet,
        permission: 'portal.credits.view',
        mobileTab: true,
      },
      {
        title: 'Messages',
        href: '/portal/messages',
        icon: MessageSquare,
        permission: 'portal.messages.view',
        mobileTab: true,
      },
      {
        title: 'Calling',
        href: '/portal/calling',
        icon: Phone,
        permission: 'portal.messages.view',
      },
    ],
  },
]

export function getNavigationForRole(role: UserRole): NavGroup[] {
  if (role === 'clinic_admin' || role === 'clinic_staff') {
    return clinicNav
  }

  if (role === 'sales_rep') {
    return internalNav
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => item.href !== '/calls/queue' && item.href !== '/leads',
        ),
      }))
      .filter((group) => group.items.length > 0)
  }

  return internalNav
}

export function getMobileTabs(role: UserRole, permissions: Set<string>): NavItem[] {
  const nav = getNavigationForRole(role)
  return nav
    .flatMap((group) => group.items)
    .filter(
      (item) =>
        item.mobileTab &&
        (!item.permission || permissions.has(item.permission)),
    )
    .slice(0, 4)
}

export const commandSearchItems = [
  { title: 'Dashboard', href: '/dashboard', keywords: ['home', 'overview'] },
  { title: 'Call queue', href: '/calls/queue', keywords: ['calls', 'queue'] },
  { title: 'Leads', href: '/leads', keywords: ['patients', 'prospects'] },
  { title: 'Bookings', href: '/bookings', keywords: ['appointments'] },
  { title: 'Clinics', href: '/clinics', keywords: ['crm', 'pipeline'] },
  { title: 'Settings', href: '/settings', keywords: ['config', 'rules'] },
  { title: 'Permissions', href: '/permissions', keywords: ['access', 'roles'] },
  { title: 'Notifications', href: '/notifications', keywords: ['alerts'] },
]
