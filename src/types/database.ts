export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AppRole = "member" | "admin"

export type ResourceCategory =
  | "rutinas"
  | "calentamiento"
  | "movilidad"
  | "cardio"
  | "nutricion_basica"
  | "recuperacion"
  | "principiantes"
  | "nutricion"
  | "entrenamiento"
  | "motivacion"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          age: number | null
          sex: string | null
          weight_kg: number | null
          height_cm: number | null
          experience: string | null
          goal: string | null
          days_per_week: number | null
          bmi: number | null
          bmi_category: string | null
          is_admin: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          age?: number | null
          sex?: string | null
          weight_kg?: number | null
          height_cm?: number | null
          experience?: string | null
          goal?: string | null
          days_per_week?: number | null
          bmi?: number | null
          bmi_category?: string | null
          /** @deprecated Use public.user_roles. Protected against writes by authenticated at the DB level. */
          is_admin?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          username?: string
          full_name?: string | null
          age?: number | null
          sex?: string | null
          weight_kg?: number | null
          height_cm?: number | null
          experience?: string | null
          goal?: string | null
          days_per_week?: number | null
          bmi?: number | null
          bmi_category?: string | null
          /** @deprecated Use public.user_roles. Protected against writes by authenticated at the DB level. */
          is_admin?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      routine_templates: {
        Row: {
          id: string
          title: string
          slug: string | null
          goal: string
          experience: string
          days_per_week: number
          short_description: string
          duration_weeks: number
          estimated_session_minutes: number
          level_label: string
          focus_areas: string[]
          routine_data: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug?: string | null
          goal: string
          experience: string
          days_per_week: number
          short_description: string
          duration_weeks: number
          estimated_session_minutes: number
          level_label: string
          focus_areas?: string[]
          routine_data: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          slug?: string | null
          goal?: string
          experience?: string
          days_per_week?: number
          short_description?: string
          duration_weeks?: number
          estimated_session_minutes?: number
          level_label?: string
          focus_areas?: string[]
          routine_data?: Json
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      routine_recommendations: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          goal: string
          experience: string
          days_per_week: number
          routine_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          goal: string
          experience: string
          days_per_week: number
          routine_data: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string
          goal?: string
          experience?: string
          days_per_week?: number
          routine_data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          id: string
          slug: string
          title: string
          description: string
          category: ResourceCategory
          file_url: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          description: string
          category: ResourceCategory
          file_url: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          slug?: string
          title?: string
          description?: string
          category?: ResourceCategory
          file_url?: string
          is_active?: boolean
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          event_type?: string
          metadata?: Json
        }
        Relationships: []
      }
      user_resource_downloads: {
        Row: {
          id: string
          user_id: string
          resource_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resource_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          resource_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          user_id: string
          role: AppRole
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          role: AppRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          role?: AppRole
          updated_at?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          id: string
          source: string
          source_id: string
          name: string
          body_part: string
          equipment: string
          target: string
          muscle_group: string | null
          secondary_muscles: string[]
          instructions: Json
          instruction_steps: Json
          source_created_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source: string
          source_id: string
          name: string
          body_part: string
          equipment: string
          target: string
          muscle_group?: string | null
          secondary_muscles?: string[]
          instructions?: Json
          instruction_steps?: Json
          source_created_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          source?: string
          source_id?: string
          name?: string
          body_part?: string
          equipment?: string
          target?: string
          muscle_group?: string | null
          secondary_muscles?: string[]
          instructions?: Json
          instruction_steps?: Json
          source_created_at?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      exercise_media: {
        Row: {
          id: string
          exercise_id: string
          kind: "image" | "gif" | "video"
          storage_path: string
          mime_type: string | null
          width: number | null
          height: number | null
          attribution: string | null
          license_status: "pending" | "licensed" | "owned"
          license_reference: string | null
          is_primary: boolean
          is_active: boolean
          content_sha256: string | null
          source: string | null
          source_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          exercise_id: string
          kind: "image" | "gif" | "video"
          storage_path: string
          mime_type?: string | null
          width?: number | null
          height?: number | null
          attribution?: string | null
          license_status: "pending" | "licensed" | "owned"
          license_reference?: string | null
          is_primary?: boolean
          is_active?: boolean
          content_sha256?: string | null
          source?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          exercise_id?: string
          kind?: "image" | "gif" | "video"
          storage_path?: string
          mime_type?: string | null
          width?: number | null
          height?: number | null
          attribution?: string | null
          license_status?: "pending" | "licensed" | "owned"
          license_reference?: string | null
          is_primary?: boolean
          is_active?: boolean
          content_sha256?: string | null
          source?: string | null
          source_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_media_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
