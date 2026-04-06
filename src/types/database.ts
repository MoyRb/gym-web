export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ResourceCategory = "nutricion" | "entrenamiento" | "recuperacion" | "motivacion"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
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
          is_admin?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
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
          is_admin?: boolean | null
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
          title: string
          description: string
          category: ResourceCategory
          file_url: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          category: ResourceCategory
          file_url: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
