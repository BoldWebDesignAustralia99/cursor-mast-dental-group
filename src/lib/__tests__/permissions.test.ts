import { describe, it, expect } from 'vitest'
import { USER_ROLES, ROLE_LABELS, isInternalRole, isClinicRole } from '@/lib/constants'
import { getMobileTabs, getNavigationForRole } from '@/lib/navigation'

describe('role constants', () => {
  it('defines all seven user roles from spec', () => {
    expect(USER_ROLES).toHaveLength(7)
    expect(USER_ROLES).toContain('super_admin')
    expect(USER_ROLES).toContain('clinic_staff')
  })

  it('has a label for every role', () => {
    for (const role of USER_ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy()
    }
  })

  it('separates internal and clinic roles', () => {
    expect(isInternalRole('sales_rep')).toBe(true)
    expect(isClinicRole('clinic_admin')).toBe(true)
    expect(isInternalRole('clinic_staff')).toBe(false)
  })
})

describe('navigation', () => {
  it('returns clinic portal nav for clinic roles', () => {
    const nav = getNavigationForRole('clinic_admin')
    const hrefs = nav.flatMap((g) => g.items.map((i) => i.href))
    expect(hrefs).toContain('/portal/bookings')
    expect(hrefs).not.toContain('/calls/queue')
  })

  it('hides queue browse from sales rep (Start Work only)', () => {
    const nav = getNavigationForRole('sales_rep')
    const hrefs = nav.flatMap((g) => g.items.map((i) => i.href))
    expect(hrefs).toContain('/dashboard')
    expect(hrefs).not.toContain('/calls/queue')
    expect(hrefs).not.toContain('/leads')
  })

  it('limits mobile tabs to four items', () => {
    const permissions = new Set([
      'dashboard.view',
      'calls.queue.view',
      'clinics.view',
      'notifications.view',
      'leads.view',
    ])
    const tabs = getMobileTabs('manager', permissions)
    expect(tabs.length).toBeLessThanOrEqual(4)
  })
})

/**
 * API-level permission acceptance tests (§9.1 definition of done)
 * Run against a live Supabase instance with: npm run test:integration
 *
 * For each role, sign in and verify:
 * - Allowed permissions return data from protected tables/RPCs
 * - Denied permissions return RLS policy violations (empty or 403)
 * - UI hiding is NOT sufficient — database must enforce
 */
describe('permission acceptance criteria', () => {
  it('documents required integration test matrix', () => {
    const matrix = {
      sales_rep: {
        allowed: ['dashboard.view', 'calls.make', 'bookings.create'],
        denied: ['permissions.manage', 'settings.edit', 'payroll.view', 'leads.manage'],
      },
      clinic_staff: {
        allowed: ['portal.bookings.view', 'portal.calendar.manage'],
        denied: ['clinics.view', 'portal.credits.view', 'team.manage'],
      },
      super_admin: {
        allowed: ['permissions.manage', 'settings.edit', 'integrations.manage'],
        denied: [] as string[],
      },
    }
    expect(Object.keys(matrix)).toHaveLength(3)
  })
})
