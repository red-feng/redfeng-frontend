/**
 * @param {{ bookingId?: string; packageId?: string; roomId?: string }} params
 */
export function buildChatLoginNextTarget(params) {
  if (params.bookingId) return `/chat?booking_id=${encodeURIComponent(params.bookingId)}`
  if (params.packageId) return `/chat?package_id=${encodeURIComponent(params.packageId)}`
  if (params.roomId) return `/chat?room_id=${encodeURIComponent(params.roomId)}`
  return "/chat"
}

/**
 * @param {string} event
 */
export function shouldRefreshPublicAuthShell(event) {
  return event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED"
}

/**
 * @param {{ initialSelectionWasExplicit: boolean; hasAlreadySkippedInitialAutoRead: boolean }} params
 */
export function shouldMarkRoomReadOnActivation(params) {
  if (params.initialSelectionWasExplicit) return true
  return params.hasAlreadySkippedInitialAutoRead
}
