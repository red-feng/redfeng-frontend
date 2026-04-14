type AdminSupabase = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>

export type PackageChatActorRole = "customer" | "merchant"

export type PackageChatRoomAccessRow = {
  id: string
  package_id: string
  customer_id: string
  merchant_user_id: string
}

// Locked policy:
// 1) Customer can access own room.
// 2) Merchant can access only when room merchant_user_id matches AND package belongs to one of merchant accounts owned by that user.
export const PACKAGE_CHAT_ROLE_POLICY_VERSION = "2026-04-14"

export async function resolvePackageChatActorRole(
  adminSupabase: AdminSupabase,
  userId: string,
  room: PackageChatRoomAccessRow,
): Promise<PackageChatActorRole | null> {
  if (room.customer_id === userId) {
    return "customer"
  }

  if (room.merchant_user_id !== userId) {
    return null
  }

  const { data: currentMerchantIds } = await adminSupabase
    .from("merchants")
    .select("id")
    .eq("user_id", userId)

  const allowedMerchantIds = new Set((currentMerchantIds || []).map((item) => item.id))
  if (allowedMerchantIds.size === 0) {
    return null
  }

  const { data: pkg } = await adminSupabase
    .from("packages")
    .select("merchant_id")
    .eq("id", room.package_id)
    .maybeSingle()

  if (!pkg?.merchant_id || !allowedMerchantIds.has(pkg.merchant_id)) {
    return null
  }

  return "merchant"
}
