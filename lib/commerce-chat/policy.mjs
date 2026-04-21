// LOCKED CONTRACT:
// Role penghapusan room commerce hanya boleh customer dan merchant.
// Jika ingin mengubah aturan ini, update test regression commerce-chat terlebih dahulu
// dan verifikasi ulang alur hapus room customer <-> merchant end-to-end.
export const COMMERCE_CHAT_DELETE_POLICY_VERSION = "2026-04-18"
export const COMMERCE_CHAT_DELETE_ALLOWED_ACTOR_ROLES = Object.freeze(["customer", "merchant"])
export const COMMERCE_CHAT_DELETE_ROLE_LOCK = Object.freeze({
  allowedActorRoles: COMMERCE_CHAT_DELETE_ALLOWED_ACTOR_ROLES,
  deniedActorRoles: Object.freeze(["system", null]),
  notes: Object.freeze([
    "Hanya customer dan merchant participant utama yang boleh menghapus room commerce.",
    "Role internal diblok di lapisan profil dan tidak boleh ikut menjadi actor delete.",
    "System actor tidak boleh menghapus room commerce.",
  ]),
})

/**
 * @typedef {"customer" | "merchant" | "system" | null} CommerceSenderRole
 */

/**
 * @typedef {"customer" | "merchant"} CommerceActorRole
 */

/**
 * @param {{ hasExistingInquiryThread: boolean }} params
 * @returns {"reuse_inquiry_thread" | "create_inquiry_thread"}
 */
export function decideCommerceInquiryThreadResolution(params) {
  return params.hasExistingInquiryThread ? "reuse_inquiry_thread" : "create_inquiry_thread"
}

/**
 * Penghapusan room commerce sengaja dikunci hanya untuk participant eksternal utama.
 * Internal role selalu diblok di lapisan profil, dan system actor tidak boleh menghapus room.
 * Jangan longgarkan helper ini tanpa update kontrak test yang mengunci role delete.
 *
 * @param {CommerceActorRole | "system" | null | undefined} actorRole
 * @returns {boolean}
 */
export function canDeleteCommerceThread(actorRole) {
  return COMMERCE_CHAT_DELETE_ALLOWED_ACTOR_ROLES.includes(actorRole)
}

/**
 * Helper ini sengaja dipakai sebagai guard pusat agar kontrak role delete
 * tidak tersebar dan tidak mudah berubah saat file lain disentuh.
 * Jangan bypass guard ini dari flow delete utama.
 *
 * @param {CommerceActorRole | "system" | null | undefined} actorRole
 * @returns {CommerceActorRole}
 */
export function requireCommerceDeleteActorRole(actorRole) {
  if (actorRole === "customer" || actorRole === "merchant") {
    return actorRole
  }

  throw new Error("Role akun ini tidak diizinkan menghapus thread commerce.")
}

/**
 * @param {string | null | undefined} role
 */
export function shouldBlockInternalRoleFromCommerceChat(role) {
  const normalized = String(role || "").trim().toLowerCase()
  return (
    normalized === "admin" ||
    normalized === "operations_manager" ||
    normalized === "finance" ||
    normalized === "finance_manager" ||
    normalized === "superadmin"
  )
}

/**
 * @param {{
 *   actorRole: "customer" | "merchant"
 *   lastMessageSenderRole: CommerceSenderRole
 *   lastMessageAt: string | null | undefined
 *   customerLastReadAt?: string | null | undefined
 *   merchantLastReadAt?: string | null | undefined
 * }} params
 */
export function isCommerceThreadUnreadForActor(params) {
  if (!params.lastMessageAt) return false
  if (!params.lastMessageSenderRole || params.lastMessageSenderRole === "system") return false
  if (params.actorRole === params.lastMessageSenderRole) return false

  const readAt =
    params.actorRole === "customer"
      ? String(params.customerLastReadAt || "")
      : String(params.merchantLastReadAt || "")

  if (!readAt) return true
  return String(params.lastMessageAt) > readAt
}
