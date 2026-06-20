export const DEMO_LEAD_ID = 'c0000001-0000-4000-8000-000000000001'

export const DEMO_LEAD = {
  id: DEMO_LEAD_ID,
  first_name: 'Raewyn',
  last_name: 'Mitchell',
  phone: '0412 660 412',
  email: 'raewyn@example.com',
  suburb: 'Caboolture South',
  state: 'QLD',
  source: 'facebook',
  stage: 'contacted' as const,
  treatment_interest: 'Upper & Lower Set',
  funding_type: 'Superannuation',
  decision_maker: 'David (husband)',
  call_count: 2,
  notes: 'Missing upper and lower molars. Currently wears partial plate.',
}

export const DEMO_CALL_FLOW = [
  { id: '1', name: 'Open', time_range: '0–2 min', sort_order: 1, script_content: 'Hi {{first_name}}, this is {{rep_name}} from Mast Dental Group. You recently enquired about dental implants — is now a good time to chat?' },
  { id: '2', name: 'Discovery', time_range: '2–10 min', sort_order: 2, script_content: 'Tell me what\'s been going on with your teeth and what you\'re hoping to achieve.' },
  { id: '3', name: 'Educate', time_range: '10–18 min', sort_order: 3, script_content: 'At the consult we do a cone-beam 3D scan, OPG, smile design, and colour match — and show you a preview on screen. That\'s normally $395.' },
  { id: '4', name: 'Finance Check', time_range: '18–22 min', sort_order: 4, script_content: 'Let\'s check eligibility: household income, any bankruptcies or debt agreements, and citizenship status.' },
  { id: '5', name: 'Sell the Dentist', time_range: '22–26 min', sort_order: 5, script_content: 'Dr Evelyn Chin is a specialist in implant dentistry with years of experience in All-on-X cases.' },
  { id: '6', name: 'Take Deposit', time_range: '26–28 min', sort_order: 6, script_content: 'To secure your consult we take a $75 holding deposit. I can take payment now or send you a secure link via SMS.' },
  { id: '7', name: 'Book', time_range: '28–30 min', sort_order: 7, script_content: 'Let me find the nearest clinic to {{suburb}} and get you booked in with the best available dentist.' },
]

export const DEMO_NOTES = [
  {
    id: '1',
    body: 'Missing upper and lower molars. Currently wears partial plate. Husband David is decision-maker. Has $50k quote from competitor.',
    source: 'ai' as const,
    created_at: new Date(Date.now() - 60_000).toISOString(),
  },
  {
    id: '2',
    body: 'David confirmed on call — superannuation funding likely.',
    source: 'user' as const,
    created_at: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: '3',
    body: 'Patient anxious about pain. Reassured about sedation options.',
    source: 'ai' as const,
    created_at: new Date(Date.now() - 180_000).toISOString(),
  },
]

export const DEMO_CLINICS = [
  {
    clinic_id: 'a0000001-0000-4000-8000-000000000003',
    clinic_name: 'North Lakes',
    suburb: 'North Lakes',
    distance_km: 18.2,
    drive_time_min: 22,
    credit_balance: 8,
    has_senior: false,
    senior_visiting: false,
    is_recommended: false,
  },
  {
    clinic_id: 'a0000001-0000-4000-8000-000000000002',
    clinic_name: 'Chermside',
    suburb: 'Chermside',
    distance_km: 24.5,
    drive_time_min: 28,
    credit_balance: 12,
    has_senior: false,
    senior_visiting: true,
    is_recommended: false,
  },
  {
    clinic_id: 'a0000001-0000-4000-8000-000000000001',
    clinic_name: 'Moorooka',
    suburb: 'Moorooka',
    distance_km: 32.1,
    drive_time_min: 35,
    credit_balance: 45,
    has_senior: true,
    senior_visiting: false,
    is_recommended: true,
  },
]

export const DEMO_SLOTS = [
  { slot_start: '2026-06-17T00:30:00.000Z', practitioner_name: 'Dr Evelyn Chin', is_senior: true, label: '10:30 AM' },
  { slot_start: '2026-06-17T01:30:00.000Z', practitioner_name: 'Dr Evelyn Chin', is_senior: true, label: '11:30 AM' },
  { slot_start: '2026-06-17T02:30:00.000Z', practitioner_name: 'Dr Evelyn Chin', is_senior: true, label: '12:30 PM' },
  { slot_start: '2026-06-17T04:00:00.000Z', practitioner_name: 'Dr Evelyn Chin', is_senior: true, label: '2:00 PM' },
  { slot_start: '2026-06-17T05:00:00.000Z', practitioner_name: 'Dr Evelyn Chin', is_senior: true, label: '3:00 PM' },
]

export const DEMO_QUEUE = [
  { ...DEMO_LEAD, last_name: 'Mitchell', next_callback_at: null },
  {
    id: 'c0000001-0000-4000-8000-000000000003',
    first_name: 'Maria',
    last_name: 'Garcia',
    phone: '0400 333 444',
    suburb: 'Redcliffe',
    stage: 'callback' as const,
    call_count: 1,
    treatment_interest: 'All-on-4',
    next_callback_at: new Date().toISOString(),
  },
  {
    id: 'c0000001-0000-4000-8000-000000000002',
    first_name: 'John',
    last_name: 'Smith',
    phone: '0400 111 222',
    suburb: 'Brisbane',
    stage: 'new' as const,
    call_count: 0,
    treatment_interest: 'Single implant',
    next_callback_at: null,
  },
]

export const DEMO_DASHBOARD = {
  open_leads: 24,
  bookings_today: 6,
  shows_this_week: 18,
  callbacks_due: 3,
  open_tasks: 7,
}
