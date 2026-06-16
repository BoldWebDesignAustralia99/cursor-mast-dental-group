import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'
import type { AppSetting } from '@/types/database'

const DEMO_SETTINGS: AppSetting[] = [
  {
    id: '1',
    key: 'app.name',
    value: 'Mast Dental Group',
    value_type: 'string',
    label: 'Application name',
    description: 'Display name across the platform',
    category: 'general',
    is_public: true,
    updated_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    key: 'booking.default_duration_minutes',
    value: 60,
    value_type: 'number',
    label: 'Default slot duration',
    description: 'Meeting duration in minutes',
    category: 'bookings',
    is_public: false,
    updated_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    key: 'credits.low_balance_threshold',
    value: 5,
    value_type: 'number',
    label: 'Low balance threshold',
    description: 'Credits remaining before low-balance alerts',
    category: 'billing',
    is_public: false,
    updated_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    key: 'credits.zero_balance_pause',
    value: true,
    value_type: 'boolean',
    label: 'Pause at zero balance',
    description: 'Automatically pause clinic lead routing at zero credits',
    category: 'billing',
    is_public: false,
    updated_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    key: 'lead.excluded_locations',
    value: [],
    value_type: 'string_array',
    label: 'Excluded locations',
    description: 'Suburbs/cities excluded from routing',
    category: 'leads',
    is_public: false,
    updated_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export function useSettings(category?: string) {
  return useQuery({
    queryKey: ['settings', category ?? 'all'],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        const settings = DEMO_SETTINGS
        return category
          ? settings.filter((s) => s.category === category)
          : settings
      }

      let query = supabase
        .from('app_settings')
        .select(
          'id, key, value, value_type, label, description, category, is_public, updated_at',
        )
        .order('category')
        .order('label')

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query
      if (error) throw error
      return data as AppSetting[]
    },
  })
}

export function useSetting(key: string) {
  return useQuery({
    queryKey: ['settings', 'key', key],
    queryFn: async () => {
      if (isDemoModeEnabled()) {
        return DEMO_SETTINGS.find((s) => s.key === key) ?? null
      }

      const { data, error } = await supabase
        .from('app_settings')
        .select('id, key, value, value_type, label, description, category')
        .eq('key', key)
        .maybeSingle()
      if (error) throw error
      return data as AppSetting | null
    },
  })
}

export function useUpdateSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      key,
      value,
      updatedBy,
    }: {
      key: string
      value: unknown
      updatedBy: string
    }) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ value, updated_by: updatedBy })
        .eq('key', key)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function getSettingValue<T>(setting: AppSetting | null | undefined, fallback: T): T {
  if (!setting || setting.value === null || setting.value === undefined) {
    return fallback
  }
  return setting.value as T
}
