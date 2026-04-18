export const COMMERCE_CHAT_DELETE_POLICY_VERSION = "2026-04-18"

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
 *
 * @param {CommerceActorRole | "system" | null | undefined} actorRole
 * @returns {boolean}
 */
export function canDeleteCommerceThread(actorRole) {
  return actorRole === "customer" || actorRole === "merchant"
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
