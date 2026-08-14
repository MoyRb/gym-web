export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ── Tipos derivados para vistas enriquecidas ──────────────────────────────────

export type WorkoutPlanRow    = Database["public"]["Tables"]["workout_plans"]["Row"]
export type WorkoutPlanDayRow = Database["public"]["Tables"]["workout_plan_days"]["Row"]
export type WorkoutPlanExerciseRow = Database["public"]["Tables"]["workout_plan_exercises"]["Row"]
export type ExerciseRow       = Database["public"]["Tables"]["exercises"]["Row"]

export interface WorkoutPlanExerciseWithDetails extends WorkoutPlanExerciseRow {
  exercise: Pick<ExerciseRow, "id" | "name" | "body_part" | "equipment" | "target" | "muscle_group">
}

export interface WorkoutDayWithExercises extends WorkoutPlanDayRow {
  exercises: WorkoutPlanExerciseWithDetails[]
}

export interface WorkoutPlanWithDays extends WorkoutPlanRow {
  days: WorkoutDayWithExercises[]
}

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
      workout_plans: {
        Row: {
          id: string
          user_id: string
          name: string
          goal: string
          experience: string
          days_per_week: number
          source: "template" | "manual" | "ai"
          status: "draft" | "active" | "archived"
          version: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          goal: string
          experience: string
          days_per_week: number
          source?: "template" | "manual" | "ai"
          status?: "draft" | "active" | "archived"
          version?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          goal?: string
          experience?: string
          days_per_week?: number
          source?: "template" | "manual" | "ai"
          status?: "draft" | "active" | "archived"
          version?: number
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      workout_plan_days: {
        Row: {
          id: string
          workout_plan_id: string
          day_number: number
          name: string
          description: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workout_plan_id: string
          day_number: number
          name: string
          description?: string | null
          sort_order: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          day_number?: number
          name?: string
          description?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_days_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          }
        ]
      }
      workout_plan_exercises: {
        Row: {
          id: string
          workout_plan_day_id: string
          exercise_id: string
          sort_order: number
          sets: number
          reps_min: number | null
          reps_max: number | null
          duration_seconds: number | null
          rest_seconds: number
          rir: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workout_plan_day_id: string
          exercise_id: string
          sort_order: number
          sets: number
          reps_min?: number | null
          reps_max?: number | null
          duration_seconds?: number | null
          rest_seconds?: number
          rir?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          sort_order?: number
          sets?: number
          reps_min?: number | null
          reps_max?: number | null
          duration_seconds?: number | null
          rest_seconds?: number
          rir?: number | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_exercises_workout_plan_day_id_fkey"
            columns: ["workout_plan_day_id"]
            isOneToOne: false
            referencedRelation: "workout_plan_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          }
        ]
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
      create_workout_plan: {
        Args: {
          p_user_id: string
          p_name: string
          p_goal: string
          p_experience: string
          p_days_per_week: number
          p_source: string
          p_days: Json
        }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
