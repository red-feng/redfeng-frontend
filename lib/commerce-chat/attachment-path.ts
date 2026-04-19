export const COMMERCE_CHAT_ATTACHMENT_BUCKET = "commerce-chat-attachments"

const COMMERCE_CHAT_STORAGE_PUBLIC_MARKER = `/storage/v1/object/public/${COMMERCE_CHAT_ATTACHMENT_BUCKET}/`

export function extractCommerceChatAttachmentPathFromPublicUrl(url: string | null | undefined) {
  const raw = String(url || "").trim()
  if (!raw) return null

  const markerIndex = raw.indexOf(COMMERCE_CHAT_STORAGE_PUBLIC_MARKER)
  if (markerIndex === -1) return null

  const encodedPath = raw
    .slice(markerIndex + COMMERCE_CHAT_STORAGE_PUBLIC_MARKER.length)
    .split("?", 1)[0]
    .trim()

  if (!encodedPath) return null

  try {
    return decodeURIComponent(encodedPath)
  } catch {
    return encodedPath
  }
}
