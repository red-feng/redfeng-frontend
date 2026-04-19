import type { SupabaseClient } from "@supabase/supabase-js"
import { removeCommerceChatAttachmentObjects } from "./attachments-core"

type RetentionAttachmentRow = {
  id: string
  attachment_url: string | null
}

export async function cleanupCommerceChatMessagesOlderThanSixMonthsViaStorageApi(
  supabase: SupabaseClient,
  now = new Date(),
) {
  const cutoffIso = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString()

  const { data: retentionMessages, error: retentionMessagesError } = await supabase
    .from("commerce_chat_messages")
    .select("id, attachment_url")
    .lt("created_at", cutoffIso)
    .not("attachment_url", "is", null)

  if (retentionMessagesError) {
    return {
      ok: false as const,
      error: retentionMessagesError.message || "Gagal membaca lampiran message commerce lama.",
      scannedMessageCount: 0,
      removedAttachmentCount: 0,
      deletedMessageCount: 0,
      attachmentDeleteErrors: [] as string[],
    }
  }

  const attachments = ((retentionMessages as RetentionAttachmentRow[] | null) || [])

  const attachmentCleanup = await removeCommerceChatAttachmentObjects(
    supabase,
    attachments.map((row) => row.attachment_url),
  )

  if (attachmentCleanup.errors.length) {
    return {
      ok: false as const,
      error: "Sebagian attachment message commerce lama gagal dihapus via Storage API. Cleanup database dibatalkan agar tidak meninggalkan orphan file.",
      scannedMessageCount: attachments.length,
      removedAttachmentCount: attachmentCleanup.removedCount,
      deletedMessageCount: 0,
      attachmentDeleteErrors: attachmentCleanup.errors,
    }
  }

  const { data: deletedMessageCountRaw, error: cleanupError } = await supabase.rpc(
    "cleanup_commerce_chat_messages_older_than_six_months",
  )

  if (cleanupError) {
    return {
      ok: false as const,
      error: cleanupError.message || "Gagal menjalankan cleanup retention commerce chat.",
      scannedMessageCount: attachments.length,
      removedAttachmentCount: attachmentCleanup.removedCount,
      deletedMessageCount: 0,
      attachmentDeleteErrors: [] as string[],
    }
  }

  return {
    ok: true as const,
    error: null,
    scannedMessageCount: attachments.length,
    removedAttachmentCount: attachmentCleanup.removedCount,
    deletedMessageCount: Number(deletedMessageCountRaw || 0),
    attachmentDeleteErrors: [] as string[],
  }
}
