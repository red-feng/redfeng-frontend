export const COMMERCE_CHAT_DELETE_ROUTE_CONTRACT_VERSION = "2026-04-18"

export const COMMERCE_CHAT_DELETE_ROUTE_ERRORS = Object.freeze({
  unauthorized: "Unauthorized",
  forbidden: "Forbidden",
  invalidThread: "Thread commerce tidak valid.",
  deleteFailed: "Gagal menghapus thread commerce.",
})

/**
 * @param {string | null | undefined} message
 * @returns {number}
 */
export function resolveCommerceChatDeleteErrorStatus(message) {
  const lowered = String(message || "").toLowerCase()

  if (!lowered) return 500
  if (lowered.includes("akses") || lowered.includes("tidak diizinkan")) return 403
  if (lowered.includes("tidak valid")) return 400
  return 500
}
