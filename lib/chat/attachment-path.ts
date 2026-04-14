const PACKAGE_CHAT_ATTACHMENT_BUCKET = "package-chat-attachments"
const PUBLIC_URL_MARKER = `/storage/v1/object/public/${PACKAGE_CHAT_ATTACHMENT_BUCKET}/`

export function getPackageChatAttachmentBucket() {
  return PACKAGE_CHAT_ATTACHMENT_BUCKET
}

export function extractPackageChatAttachmentPath(attachmentUrl: string | null | undefined) {
  const raw = String(attachmentUrl || "").trim()
  if (!raw) return null
  const markerIndex = raw.indexOf(PUBLIC_URL_MARKER)
  if (markerIndex < 0) return null
  const objectPathWithQuery = raw.slice(markerIndex + PUBLIC_URL_MARKER.length)
  const objectPath = objectPathWithQuery.split("?")[0] || ""
  if (!objectPath) return null
  try {
    return decodeURIComponent(objectPath)
  } catch {
    return objectPath
  }
}
