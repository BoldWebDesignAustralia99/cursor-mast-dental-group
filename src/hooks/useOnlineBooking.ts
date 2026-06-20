import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'

export interface OnlineBookingPage {
  page_id: string
  title: string
  description: string | null
  clinic_id: string
  clinic_name: string
  suburb: string | null
  deposit_cents: number
}

const DEMO_PAGE: OnlineBookingPage = {
  page_id: 'c0000001-0000-4000-8000-000000000001',
  title: 'Book Your Free Implant Consult',
  description: 'Schedule your consultation at Mast Dental Moorooka',
  clinic_id: 'a0000001-0000-4000-8000-000000000001',
  clinic_name: 'Mast Dental Moorooka',
  suburb: 'Moorooka',
  deposit_cents: 7500,
}

export function useOnlineBookingPage(slug: string) {
  return useQuery({
    queryKey: ['online-booking-page', slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      if (isDemoModeEnabled()) return DEMO_PAGE
      const { data, error } = await (supabase as any).rpc('get_online_booking_page', { p_slug: slug })
      if (error) throw error
      const row = (data as unknown as OnlineBookingPage[] | null)?.[0]
      if (!row) throw new Error('Booking page not found')
      return row
    },
  })
}

export function useCreateOnlineBooking() {
  return useMutation({
    mutationFn: async (input: {
      slug: string
      firstName: string
      lastName: string
      phone: string
      email?: string
      scheduledStart: string
      scheduledEnd: string
    }) => {
      if (isDemoModeEnabled()) return crypto.randomUUID()
      const { data, error } = await (supabase as any).rpc('create_online_booking', {
        p_slug: input.slug,
        p_first_name: input.firstName,
        p_last_name: input.lastName,
        p_phone: input.phone,
        p_email: input.email ?? null,
        p_scheduled_start: input.scheduledStart,
        p_scheduled_end: input.scheduledEnd,
      })
      if (error) throw error
      return data as string
    },
  })
}
