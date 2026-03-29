import { createAdminClient } from "@/lib/supabase/admin"

type AdminAuditParams = {
  actorId: string
  actorRole?: string | null
  targetType: "merchant" | "package" | "booking" | "internal_account" | "refund"
  targetId: string
  action: string
  summary: string
  metadata?: Record<string, unknown> | null
}

export async function createAdminAuditLog({
  actorId,
  actorRole,
  targetType,
  targetId,
  action,
  summary,
  metadata,
}: AdminAuditParams) {
  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.from("admin_action_logs").insert({
    actor_id: actorId,
    actor_role: actorRole || null,
    target_type: targetType,
    target_id: targetId,
    action,
    summary,
    metadata: metadata || {},
  })

  if (error) {
    console.error("ADMIN AUDIT LOG ERROR:", error)
  }
}
