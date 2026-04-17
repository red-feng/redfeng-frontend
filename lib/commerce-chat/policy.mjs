/**
 * @typedef {"customer" | "merchant" | "system" | null} CommerceSenderRole
 */

/**
 * @param {{ hasExistingInquiryThread: boolean }} params
 * @returns {"reuse_inquiry_thread" | "create_inquiry_thread"}
 */
export function decideCommerceInquiryThreadResolution(params) {
  return params.hasExistingInquiryThread ? "reuse_inquiry_thread" : "create_inquiry_thread"
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
