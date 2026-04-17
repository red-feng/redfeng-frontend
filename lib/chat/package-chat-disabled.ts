export const PACKAGE_CHAT_DISABLED_MESSAGE =
  "Chat antara merchant dan customer sudah dihapus dari aplikasi ini."

export function buildPackageChatDisabledResponse() {
  return {
    error: PACKAGE_CHAT_DISABLED_MESSAGE,
  }
}
