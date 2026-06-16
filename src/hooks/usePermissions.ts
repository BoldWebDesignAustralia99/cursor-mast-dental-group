import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'
import type {
  PermissionKey,
  RolePermission,
  UserPermissionOverride,
} from '@/types/database'
import type { UserRole } from '@/lib/constants'

const DEMO_PERMISSIONS = [
  'dashboard.view',
  'leads.view',
  'leads.manage',
  'bookings.view',
  'bookings.create',
  'calls.queue.view',
  'calls.make',
  'clinics.view',
  'clinics.manage',
  'clinics.comms.view',
  'training.view',
  'training.manage',
  'team.view',
  'team.manage',
  'settings.view',
  'settings.edit',
  'permissions.manage',
  'notifications.view',
  'portal.bookings.view',
  'portal.calendar.manage',
  'portal.credits.view',
  'portal.messages.view',
].map((key) => ({ permission_key: key, allowed: true }))

export function useMyPermissions() {
  return useQuery({
    queryKey: ['permissions', 'mine'],
    queryFn: async () => {
      if (isDemoModeEnabled()) return DEMO_PERMISSIONS

      const { data, error } = await supabase.rpc('get_my_permissions')
      if (error) throw error
      return (data ?? []) as { permission_key: string; allowed: boolean }[]
    },
    staleTime: 30_000,
  })
}

export function usePermission(key: string) {
  const { data: permissions, isLoading } = useMyPermissions()
  const allowed = permissions?.some(
    (p) => p.permission_key === key && p.allowed,
  )
  return { allowed: !!allowed, isLoading }
}

export function usePermissionKeys() {
  return useQuery({
    queryKey: ['permissions', 'keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permission_keys')
        .select('id, key, module, label, description, is_sensitive, sort_order')
        .order('module')
        .order('sort_order')
      if (error) throw error
      return data as PermissionKey[]
    },
    enabled: !isDemoModeEnabled(),
  })
}

export function useRolePermissions(role?: UserRole) {
  return useQuery({
    queryKey: ['permissions', 'role', role],
    enabled: !!role && !isDemoModeEnabled(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('id, role, permission_key, allowed')
        .eq('role', role!)
      if (error) throw error
      return data as RolePermission[]
    },
  })
}

export function useUserPermissionOverrides(staffProfileId?: string) {
  return useQuery({
    queryKey: ['permissions', 'overrides', staffProfileId],
    enabled: !!staffProfileId && !isDemoModeEnabled(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_permission_overrides')
        .select('id, staff_profile_id, permission_key, allowed, granted_by')
        .eq('staff_profile_id', staffProfileId!)
      if (error) throw error
      return data as UserPermissionOverride[]
    },
  })
}

export function useUpdateRolePermission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      role,
      permissionKey,
      allowed,
    }: {
      role: UserRole
      permissionKey: string
      allowed: boolean
    }) => {
      const { error } = await supabase.from('role_permissions').upsert(
        { role, permission_key: permissionKey, allowed },
        { onConflict: 'role,permission_key' },
      )
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['permissions', 'role', variables.role],
      })
      void queryClient.invalidateQueries({ queryKey: ['permissions', 'mine'] })
    },
  })
}

export function useUpdateUserPermissionOverride() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      staffProfileId,
      permissionKey,
      allowed,
      grantedBy,
    }: {
      staffProfileId: string
      permissionKey: string
      allowed: boolean
      grantedBy: string
    }) => {
      const { error } = await supabase.from('user_permission_overrides').upsert(
        {
          staff_profile_id: staffProfileId,
          permission_key: permissionKey,
          allowed,
          granted_by: grantedBy,
        },
        { onConflict: 'staff_profile_id,permission_key' },
      )
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['permissions', 'overrides', variables.staffProfileId],
      })
      void queryClient.invalidateQueries({ queryKey: ['permissions', 'mine'] })
    },
  })
}
