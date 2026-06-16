export const USER_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'sales_rep',
  'trainer',
  'clinic_admin',
  'clinic_staff',
] as const

export type UserRole = (typeof USER_ROLES)[number]

export const INTERNAL_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'manager',
  'sales_rep',
  'trainer',
]

export const CLINIC_ROLES: UserRole[] = ['clinic_admin', 'clinic_staff']

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  manager: 'Manager',
  sales_rep: 'Sales rep',
  trainer: 'Trainer',
  clinic_admin: 'Clinic admin',
  clinic_staff: 'Clinic staff',
}

export function isInternalRole(role: UserRole): boolean {
  return INTERNAL_ROLES.includes(role)
}

export function isClinicRole(role: UserRole): boolean {
  return CLINIC_ROLES.includes(role)
}

export const PERMISSION_MODULES = [
  'dashboard',
  'leads',
  'bookings',
  'clinics',
  'calls',
  'training',
  'team',
  'payroll',
  'settings',
  'permissions',
  'integrations',
  'portal',
  'notifications',
  'ai',
] as const

export type PermissionModule = (typeof PERMISSION_MODULES)[number]

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export const PAGE_SIZE = 50

export const STATUS_COLORS = {
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  error: 'bg-status-error',
  info: 'bg-status-info',
} as const

export type StatusVariant = keyof typeof STATUS_COLORS
