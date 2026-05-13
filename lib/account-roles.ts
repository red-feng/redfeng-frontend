import type { SupabaseClient } from "@supabase/supabase-js"

export const ACCOUNT_ROLES = [
  "customer",
  "merchant",
  "admin",
  "operations_manager",
  "finance",
  "finance_manager",
  "marketing",
  "marketing_manager",
  "superadmin",
] as const

export type AccountRole = (typeof ACCOUNT_ROLES)[number]
export type AccountRoleStatus = "active" | "revoked" | "suspended"

export function normalizeAccountRole(role: string | null | undefined): AccountRole | null {
  const normalized = String(role || "").trim().toLowerCase()
  return ACCOUNT_ROLES.includes(normalized as AccountRole) ? (normalized as AccountRole) : null
}

export async function ensureAccountRole(
  adminSupabase: SupabaseClient,
  userId: string | null | undefined,
  role: AccountRole,
  source: string,
) {
  if (!userId) return

  const { error } = await adminSupabase.from("account_roles").upsert(
    {
      user_id: userId,
      role,
      status: "active",
      source,
      updated_at: new Date().toISOString(),
      revoked_at: null,
    },
    { onConflict: "user_id,role" },
  )

  if (error) {
    throw new Error(`Gagal mengaktifkan role ${role}: ${error.message}`)
  }
}

export async function revokeAccountRole(
  adminSupabase: SupabaseClient,
  userId: string | null | undefined,
  role: AccountRole,
  source: string,
) {
  if (!userId) return

  const now = new Date().toISOString()
  const { error } = await adminSupabase.from("account_roles").upsert(
    {
      user_id: userId,
      role,
      status: "revoked",
      source,
      updated_at: now,
      revoked_at: now,
    },
    { onConflict: "user_id,role" },
  )

  if (error) {
    throw new Error(`Gagal mencabut role ${role}: ${error.message}`)
  }
}

export async function hasActiveAccountRole(
  adminSupabase: SupabaseClient,
  userId: string | null | undefined,
  role: AccountRole,
) {
  if (!userId) return false

  const { data, error } = await adminSupabase
    .from("account_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", role)
    .eq("status", "active")
    .maybeSingle()

  if (error) {
    console.error("[account-roles] failed to read account role", {
      userId,
      role,
      error: error.message,
    })
    return false
  }

  return Boolean(data?.user_id)
}

export async function ensureCustomerBaselineRole(
  adminSupabase: SupabaseClient,
  userId: string | null | undefined,
  source: string,
) {
  await ensureAccountRole(adminSupabase, userId, "customer", source)
}
