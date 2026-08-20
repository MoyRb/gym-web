import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/server"

// ── Return types ──────────────────────────────────────────────────────────────

export interface OverviewStats {
  total_users: number
  new_users_7d: number
  new_users_30d: number
  active_users_7d: number
  active_users_30d: number
  sessions_total: number
  sessions_completed: number
  sessions_in_progress: number
  sessions_7d: number
  sessions_30d: number
  sessions_completed_7d: number
  sessions_completed_30d: number
  avg_duration_seconds: number | null
  plans_ai: number
  plans_template: number
  plans_manual: number
  plans_draft: number
  ai_gen_total: number
  ai_gen_completed: number
  ai_gen_failed: number
  ai_gen_in_progress: number
  ai_gen_cancelled: number
}

export interface DailyTrendRow {
  day: string
  new_users: number
  sessions_started: number
  sessions_completed: number
}

export interface ExerciseStat {
  id: string
  name: string
  body_part: string
  equipment: string
  session_count?: number
  completed_sets?: number
}

export interface BodyPartStat {
  body_part: string
  session_count: number
}

export interface TargetStat {
  target: string
  session_count: number
}

export interface TrainingStats {
  top_exercises_by_sessions: ExerciseStat[]
  top_exercises_by_sets: ExerciseStat[]
  top_body_parts: BodyPartStat[]
  top_targets: TargetStat[]
  avg_exercises_per_session: number | null
  avg_sets_per_completed_session: number | null
}

export interface EquipmentStat {
  equipment: string
  session_occurrences: number
  unique_users: number
  completed_sets: number
  share_pct: number | null
  sessions_30d: number
  sessions_prev_30d: number
  growth_pct: number | null
}

export interface AiStats {
  total: number
  completed: number
  failed: number
  in_progress: number
  cancelled: number
  avg_batches_completed: number | null
  avg_completion_seconds: number | null
  by_goal: Array<{ goal: string; count: number }>
  by_experience: Array<{ experience: string; count: number }>
  by_days_per_week: Array<{ days_per_week: number; count: number }>
}

export interface UserStats {
  total_users: number
  users_with_active_plan: number
  users_with_any_session: number
  by_goal: Array<{ goal: string; count: number }>
  by_experience: Array<{ experience: string; count: number }>
  by_days_per_week: Array<{ days_per_week: number; count: number }>
  by_sex: Array<{ sex: string; count: number }>
  by_role: Array<{ role: string; count: number }>
}

export interface ProductStats {
  dau: number
  wau: number
  mau: number
  event_counts: Array<{
    event_type: string
    c24h: number
    c7d: number
    c30d: number
    total: number
  }>
}

export interface FunnelStats {
  signups: number
  profiles: number
  plans: number
  sessions: number
  completions: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_OVERVIEW: OverviewStats = {
  total_users: 0, new_users_7d: 0, new_users_30d: 0,
  active_users_7d: 0, active_users_30d: 0,
  sessions_total: 0, sessions_completed: 0, sessions_in_progress: 0,
  sessions_7d: 0, sessions_30d: 0, sessions_completed_7d: 0, sessions_completed_30d: 0,
  avg_duration_seconds: null,
  plans_ai: 0, plans_template: 0, plans_manual: 0, plans_draft: 0,
  ai_gen_total: 0, ai_gen_completed: 0, ai_gen_failed: 0,
  ai_gen_in_progress: 0, ai_gen_cancelled: 0,
}

const EMPTY_TRAINING: TrainingStats = {
  top_exercises_by_sessions: [],
  top_exercises_by_sets: [],
  top_body_parts: [],
  top_targets: [],
  avg_exercises_per_session: null,
  avg_sets_per_completed_session: null,
}

const EMPTY_AI: AiStats = {
  total: 0, completed: 0, failed: 0, in_progress: 0, cancelled: 0,
  avg_batches_completed: null, avg_completion_seconds: null,
  by_goal: [], by_experience: [], by_days_per_week: [],
}

const EMPTY_USERS: UserStats = {
  total_users: 0, users_with_active_plan: 0, users_with_any_session: 0,
  by_goal: [], by_experience: [], by_days_per_week: [], by_sex: [], by_role: [],
}

const EMPTY_PRODUCT: ProductStats = {
  dau: 0, wau: 0, mau: 0, event_counts: [],
}

const EMPTY_FUNNEL: FunnelStats = {
  signups: 0, profiles: 0, plans: 0, sessions: 0, completions: 0,
}

// ── Query functions ───────────────────────────────────────────────────────────

/**
 * IMPORTANT: requireAdmin() must be called before any of these functions.
 * These functions use the service-role client which bypasses RLS.
 */

export async function getOverviewStats(): Promise<OverviewStats> {
  const service = createServiceRoleClient()
  const { data, error } = await service.rpc("admin_get_overview_stats" as never)
  if (error || !data) return EMPTY_OVERVIEW
  return data as OverviewStats
}

export async function getDailyTrend(days = 30): Promise<DailyTrendRow[]> {
  const service = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service.rpc as any)("admin_get_daily_trend", {
    p_days: days,
  })
  if (error || !data) return []
  return data as DailyTrendRow[]
}

export async function getTrainingStats(): Promise<TrainingStats> {
  const service = createServiceRoleClient()
  const { data, error } = await service.rpc("admin_get_training_stats" as never)
  if (error || !data) return EMPTY_TRAINING
  return data as TrainingStats
}

export async function getEquipmentStats(): Promise<EquipmentStat[]> {
  const service = createServiceRoleClient()
  const { data, error } = await service.rpc("admin_get_equipment_stats" as never)
  if (error || !data) return []
  return (data as EquipmentStat[] | null) ?? []
}

export async function getAiStats(): Promise<AiStats> {
  const service = createServiceRoleClient()
  const { data, error } = await service.rpc("admin_get_ai_stats" as never)
  if (error || !data) return EMPTY_AI
  return data as AiStats
}

export async function getUserStats(): Promise<UserStats> {
  const service = createServiceRoleClient()
  const { data, error } = await service.rpc("admin_get_user_stats" as never)
  if (error || !data) return EMPTY_USERS
  return data as UserStats
}

export async function getProductStats(): Promise<ProductStats> {
  const service = createServiceRoleClient()
  const { data, error } = await service.rpc("admin_get_product_stats" as never)
  if (error || !data) return EMPTY_PRODUCT
  return data as ProductStats
}

export async function getFunnelStats(): Promise<FunnelStats> {
  const service = createServiceRoleClient()
  const { data, error } = await service.rpc("admin_get_funnel_stats" as never)
  if (error || !data) return EMPTY_FUNNEL
  return data as FunnelStats
}
