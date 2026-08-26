import "server-only"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { trackServerEvent } from "@/lib/analytics/server"
import { EVENTS } from "@/lib/analytics/events"
import { cancelStripeSubscriptionsForUser } from "@/lib/stripe/sync"

export async function POST(): Promise<Response> {
  // 1. Resolve the authenticated user from the server session.
  //    userId comes ONLY from the session — never from the request body.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = user.id

  try {
    // 2. Track deletion intent while user still exists.
    //    After deleteUser(), the analytics row will have user_id set to NULL
    //    automatically via the ON DELETE SET NULL foreign key.
    void trackServerEvent({
      name: EVENTS.ACCOUNT_DELETION_STARTED,
      userId,
      metadata: {},
    })

    // 3. Cancel any active Stripe subscriptions BEFORE deleting the auth user.
    //    This prevents orphaned Stripe subscriptions that would keep charging
    //    the user after their account is gone.
    //    If cancellation fails, we MUST NOT proceed with deletion.
    const cancelResult = await cancelStripeSubscriptionsForUser(userId)
    if (!cancelResult.success) {
      console.error("[DELETE /api/account/delete] Stripe cancellation failed for user:", userId)
      return Response.json({ error: cancelResult.error }, { status: 500 })
    }

    // 4. Delete the auth user using service_role — this triggers all cascades:
    //    profiles, workout_plans, sessions, sets, progress_measurements,
    //    ai_generation_sessions, user_roles, user_access, billing_customers,
    //    billing_subscriptions, etc.
    //    analytics_events.user_id is SET NULL (data is anonymized, not deleted).
    const service = createServiceRoleClient()
    const { error } = await service.auth.admin.deleteUser(userId)

    if (error) {
      console.error("[DELETE /api/account/delete] deleteUser error:", error)
      return Response.json({ error: "No se pudo eliminar la cuenta. Intenta de nuevo o contacta soporte." }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error("[DELETE /api/account/delete] unexpected error:", err)
    return Response.json({ error: "Error interno del servidor." }, { status: 500 })
  }
}
