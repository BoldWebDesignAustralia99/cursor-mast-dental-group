import { describe, it, expect } from 'vitest'
import { ROLE_LABELS } from '@/lib/constants'

describe('platform constants', () => {
  it('defines all user roles', () => {
    expect(Object.keys(ROLE_LABELS)).toContain('sales_rep')
    expect(Object.keys(ROLE_LABELS)).toContain('clinic_admin')
  })
})

describe('demo data integrity', () => {
  it('demo lead has required call screen fields', async () => {
    const { DEMO_LEAD, DEMO_CALL_FLOW } = await import('@/lib/demo-data')
    expect(DEMO_LEAD.phone).toBeTruthy()
    expect(DEMO_CALL_FLOW.length).toBeGreaterThanOrEqual(7)
  })
})

describe('online booking hooks', () => {
  it('exports demo page shape', async () => {
    const { useOnlineBookingPage } = await import('@/hooks/useOnlineBooking')
    expect(typeof useOnlineBookingPage).toBe('function')
  })
})

describe('telephony hooks', () => {
  it('exports call and transcript hooks', async () => {
    const twilio = await import('@/hooks/useTwilioCall')
    const transcript = await import('@/hooks/useLiveTranscript')
    expect(typeof twilio.useTwilioCall).toBe('function')
    expect(typeof transcript.useLiveTranscript).toBe('function')
  })
})

describe('public booking route', () => {
  it('registers online booking page component', async () => {
    const { OnlineBookingPage } = await import('@/pages/booking/OnlineBookingPage')
    expect(OnlineBookingPage.name).toBe('OnlineBookingPage')
  })
})

describe('navigation structure', () => {
  it('includes Start Work dashboard route', async () => {
    const { commandSearchItems } = await import('@/lib/navigation')
    expect(commandSearchItems.some((i) => i.href === '/dashboard')).toBe(true)
  })

  it('internal nav includes workflows for admins', async () => {
    const { getNavigationForRole } = await import('@/lib/navigation')
    const nav = getNavigationForRole('admin')
    const allHrefs = nav.flatMap((g) => g.items.map((i) => i.href))
    expect(allHrefs).toContain('/admin/workflows')
  })

  it('clinic nav includes portal calling', async () => {
    const { getNavigationForRole } = await import('@/lib/navigation')
    const nav = getNavigationForRole('clinic_admin')
    const allHrefs = nav.flatMap((g) => g.items.map((i) => i.href))
    expect(allHrefs).toContain('/portal/calling')
  })
})
