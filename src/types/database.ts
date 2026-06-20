export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'sales_rep'
  | 'trainer'
  | 'clinic_admin'
  | 'clinic_staff'

export type ThemePreference = 'system' | 'light' | 'dark'

export type SettingValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'json'
  | 'string_array'

export interface Database {
  public: {
    Tables: {
      staff_profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          full_name: string
          role: UserRole
          phone: string | null
          avatar_url: string | null
          theme_preference: ThemePreference
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          full_name: string
          role: UserRole
          phone?: string | null
          avatar_url?: string | null
          theme_preference?: ThemePreference
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          full_name?: string
          role?: UserRole
          phone?: string | null
          avatar_url?: string | null
          theme_preference?: ThemePreference
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinic_memberships: {
        Row: {
          id: string
          staff_profile_id: string
          clinic_id: string
          role: UserRole
          created_at: string
        }
        Insert: {
          id?: string
          staff_profile_id: string
          clinic_id: string
          role: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          staff_profile_id?: string
          clinic_id?: string
          role?: UserRole
          created_at?: string
        }
        Relationships: []
      }
      permission_keys: {
        Row: {
          id: string
          key: string
          module: string
          label: string
          description: string | null
          is_sensitive: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          key: string
          module: string
          label: string
          description?: string | null
          is_sensitive?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          key?: string
          module?: string
          label?: string
          description?: string | null
          is_sensitive?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: string
          role: UserRole
          permission_key: string
          allowed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          role: UserRole
          permission_key: string
          allowed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          permission_key?: string
          allowed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_permission_overrides: {
        Row: {
          id: string
          staff_profile_id: string
          permission_key: string
          allowed: boolean
          granted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_profile_id: string
          permission_key: string
          allowed: boolean
          granted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          staff_profile_id?: string
          permission_key?: string
          allowed?: boolean
          granted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          value: unknown
          value_type: SettingValueType
          label: string
          description: string | null
          category: string
          is_public: boolean
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value?: unknown
          value_type?: SettingValueType
          label: string
          description?: string | null
          category?: string
          is_public?: boolean
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: unknown
          value_type?: SettingValueType
          label?: string
          description?: string | null
          category?: string
          is_public?: boolean
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          id: string
          event_type: string
          entity_type: string
          entity_id: string
          actor_id: string | null
          payload: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          entity_type: string
          entity_id: string
          actor_id?: string | null
          payload?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          entity_type?: string
          entity_id?: string
          actor_id?: string | null
          payload?: Record<string, unknown>
          created_at?: string
        }
        Relationships: []
      }
      clinics: {
        Row: {
          id: string
          name: string
          stage: string
          country: string
          timezone: string
          is_active: boolean
          suburb: string | null
          credit_balance: number
          created_at: string
          updated_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string
          suburb: string | null
          state: string | null
          source: string
          stage: string
          treatment_interest: string | null
          funding_type: string | null
          decision_maker: string | null
          call_count: number
          notes: string | null
          next_callback_at: string | null
          last_contact_at: string | null
          created_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      communications: {
        Row: {
          id: string
          channel: string
          direction: string
          body: string | null
          transcript_summary: string | null
          lead_id: string | null
          created_at: string
          staff_id: string | null
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      call_flow_stages: {
        Row: {
          id: string
          name: string
          time_range: string | null
          script_content: string | null
          sort_order: number
          is_active: boolean
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      bookings: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      practitioners: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          event_type: string
          title: string
          body: string | null
          is_read: boolean
          created_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
    }
    Views: {
      user_permissions_view: {
        Row: {
          staff_profile_id: string
          user_id: string
          permission_key: string
          allowed: boolean
        }
        Relationships: []
      }
      dashboard_stats: {
        Row: {
          open_leads: number
          bookings_today: number
          shows_this_week: number
          callbacks_due: number
          open_tasks: number
        }
        Relationships: []
      }
    }
    Functions: {
      has_permission: {
        Args: { permission_key: string }
        Returns: boolean
      }
      get_my_permissions: {
        Args: Record<string, never>
        Returns: { permission_key: string; allowed: boolean }[]
      }
      get_my_profile: {
        Args: Record<string, never>
        Returns: Database['public']['Tables']['staff_profiles']['Row']
      }
      get_my_clinic_ids: {
        Args: Record<string, never>
        Returns: string[]
      }
      get_call_queue: {
        Args: { p_tab_id?: string; p_page?: number; p_page_size?: number }
        Returns: Record<string, unknown>[]
      }
      get_leads_list: {
        Args: { p_search?: string; p_stage?: string; p_page?: number; p_page_size?: number }
        Returns: Record<string, unknown>[]
      }
      get_suggested_clinics: {
        Args: { p_lead_id: string }
        Returns: Record<string, unknown>[]
      }
      get_available_slots: {
        Args: { p_clinic_id: string; p_date: string; p_practitioner_id?: string }
        Returns: Record<string, unknown>[]
      }
      create_booking: {
        Args: Record<string, unknown>
        Returns: string
      }
      get_bookings_list: {
        Args: { p_search?: string; p_page?: number; p_page_size?: number }
        Returns: Record<string, unknown>[]
      }
      get_clinics_list: {
        Args: { p_stage?: string; p_page?: number; p_page_size?: number }
        Returns: Record<string, unknown>[]
      }
      get_my_notifications: {
        Args: { p_page?: number; p_page_size?: number }
        Returns: Record<string, unknown>[]
      }
      start_work: {
        Args: { p_queue_type?: 'frontline' | 'reactivation' }
        Returns: { lead_id: string | null; lock_acquired: boolean; allocation_reason: string }[]
      }
      acquire_lead_lock: {
        Args: { p_lead_id: string; p_queue_type?: 'frontline' | 'reactivation' }
        Returns: boolean
      }
      heartbeat_lead_lock: {
        Args: { p_lead_id: string }
        Returns: boolean
      }
      release_lead_lock: {
        Args: { p_lead_id: string; p_reason?: string }
        Returns: boolean
      }
      get_booking_detail: {
        Args: { p_booking_id: string }
        Returns: Record<string, unknown>[]
      }
      update_booking_outcome: {
        Args: { p_booking_id: string; p_outcome: string }
        Returns: undefined
      }
      mark_notifications_read: {
        Args: { p_ids: string[] }
        Returns: number
      }
      get_routing_matrix: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      get_clinic_timeline: {
        Args: { p_clinic_id: string; p_page?: number; p_page_size?: number }
        Returns: Record<string, unknown>[]
      }
      get_clinic_onboarding: {
        Args: { p_clinic_id: string }
        Returns: Record<string, unknown>[]
      }
      get_clinic_ledger: {
        Args: { p_clinic_id: string; p_limit?: number }
        Returns: Record<string, unknown>[]
      }
      get_clinic_comms_inbox: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      get_portal_bookings: {
        Args: { p_clinic_id?: string }
        Returns: Record<string, unknown>[]
      }
      get_tasks_board: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      get_rep_leaderboard: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      get_training_journeys_list: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      get_classification_reviews: {
        Args: { p_status?: string }
        Returns: Record<string, unknown>[]
      }
      get_timesheets_recent: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
      get_leave_requests_list: {
        Args: Record<string, never>
        Returns: Record<string, unknown>[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type StaffProfile = Database['public']['Tables']['staff_profiles']['Row']
export type AppSetting = Database['public']['Tables']['app_settings']['Row']
export type PermissionKey = Database['public']['Tables']['permission_keys']['Row']
export type RolePermission = Database['public']['Tables']['role_permissions']['Row']
export type UserPermissionOverride =
  Database['public']['Tables']['user_permission_overrides']['Row']
