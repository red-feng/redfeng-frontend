import { createAdminClient } from "@/lib/supabase/admin"

const CHAT_ATTACHMENT_BUCKET = "package-chat-attachments"
const MAX_CHAT_ATTACHMENT_BYTES = 10 * 1024 * 1024

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
])

function sanitizeFileName(name: string) {
  return String(name || "attachment")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(-120) || "attachment"
}

export function isImageAttachment(mimeType: string | null | undefined) {
  return String(mimeType || "").toLowerCase().startsWith("image/")
}

export function getChatAttachmentBucket() {
  return CHAT_ATTACHMENT_BUCKET
}

export async function uploadChatAttachment(input: {
  roomId: string
  senderId: string
  file: File | null
}) {
  const file = input.file
  if (!file || file.size <= 0) {
    return { uploaded: false as const, error: null, attachment: null }
  }

  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
    return {
      uploaded: false as const,
      error: "Ukuran lampiran maksimal 10 MB.",
      attachment: null,
    }
  }

  const mimeType = String(file.type || "").trim().toLowerCase()
  if (!allowedMimeTypes.has(mimeType)) {
    return {
      uploaded: false as const,
      error: "Jenis file lampiran belum didukung.",
      attachment: null,
    }
  }

  const fileName = sanitizeFileName(file.name)
  const objectPath = `${input.roomId}/${input.senderId}/${Date.now()}-${fileName}`
  const adminSupabase = createAdminClient()
  const arrayBuffer = await file.arrayBuffer()
  const uploadBuffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await adminSupabase.storage
    .from(CHAT_ATTACHMENT_BUCKET)
    .upload(objectPath, uploadBuffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (uploadError) {
    return {
      uploaded: false as const,
      error: uploadError.message,
      attachment: null,
    }
  }

  const { data } = adminSupabase.storage.from(CHAT_ATTACHMENT_BUCKET).getPublicUrl(objectPath)

  return {
    uploaded: true as const,
    error: null,
    attachment: {
      url: data.publicUrl,
      name: fileName,
      mimeType,
    },
  }
}
