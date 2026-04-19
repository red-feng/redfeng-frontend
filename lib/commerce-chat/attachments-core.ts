import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  COMMERCE_CHAT_ATTACHMENT_BUCKET,
  extractCommerceChatAttachmentPathFromPublicUrl,
} from "./attachment-path"

const MAX_COMMERCE_CHAT_ATTACHMENT_BYTES = 10 * 1024 * 1024

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

export async function removeCommerceChatAttachmentObjects(
  supabase: SupabaseClient,
  attachmentUrls: Array<string | null | undefined>,
) {
  const objectPaths = [...new Set(
    attachmentUrls
      .map((url) => extractCommerceChatAttachmentPathFromPublicUrl(url))
      .filter((path): path is string => Boolean(path)),
  )]

  if (!objectPaths.length) {
    return {
      removedCount: 0,
      objectPaths: [] as string[],
      errors: [] as string[],
    }
  }

  const errors: string[] = []
  let removedCount = 0

  for (let index = 0; index < objectPaths.length; index += 100) {
    const chunk = objectPaths.slice(index, index + 100)
    const { error } = await supabase.storage.from(COMMERCE_CHAT_ATTACHMENT_BUCKET).remove(chunk)
    if (error) {
      errors.push(error.message || "Gagal menghapus lampiran commerce chat.")
      continue
    }
    removedCount += chunk.length
  }

  return {
    removedCount,
    objectPaths,
    errors,
  }
}

export function isCommerceChatImageAttachment(mimeType: string | null | undefined) {
  return String(mimeType || "").toLowerCase().startsWith("image/")
}

export async function uploadCommerceChatAttachment(input: {
  threadId: string
  senderId: string
  file: File | null
}) {
  const file = input.file
  if (!file || file.size <= 0) {
    return { uploaded: false as const, error: null, attachment: null }
  }

  if (file.size > MAX_COMMERCE_CHAT_ATTACHMENT_BYTES) {
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
  const objectPath = `threads/${input.threadId}/${input.senderId}/${Date.now()}-${fileName}`
  const adminSupabase = createAdminClient()
  const arrayBuffer = await file.arrayBuffer()
  const uploadBuffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await adminSupabase.storage
    .from(COMMERCE_CHAT_ATTACHMENT_BUCKET)
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

  const { data } = adminSupabase.storage.from(COMMERCE_CHAT_ATTACHMENT_BUCKET).getPublicUrl(objectPath)

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
