import type { SupabaseClient } from "@supabase/supabase-js"
import { removeCommerceChatAttachmentObjects } from "./attachments-core"

type PurgeableThreadRow = {
  id: string
}

type PurgeableMessageAttachmentRow = {
  thread_id: string
  attachment_url: string | null
}

export async function purgeDeletedCommerceChatThreadsViaStorageApi(
  supabase: SupabaseClient,
  now = new Date(),
) {
  const nowIso = now.toISOString()

  const { data: targetThreads, error: targetThreadsError } = await supabase
    .from("commerce_chat_threads")
    .select("id")
    .not("deleted_for_all_at", "is", null)
    .not("purge_after_at", "is", null)
    .lte("purge_after_at", nowIso)

  if (targetThreadsError) {
    return {
      ok: false as const,
      error: targetThreadsError.message || "Gagal membaca thread commerce yang siap dipurge.",
      scannedThreadCount: 0,
      removedAttachmentCount: 0,
      purgedThreadCount: 0,
      attachmentDeleteErrors: [] as string[],
    }
  }

  const threadIds = (((targetThreads as PurgeableThreadRow[] | null) || []))
    .map((thread) => thread.id)
    .filter(Boolean)

  if (!threadIds.length) {
    return {
      ok: true as const,
      error: null,
      scannedThreadCount: 0,
      removedAttachmentCount: 0,
      purgedThreadCount: 0,
      attachmentDeleteErrors: [] as string[],
    }
  }

  const { data: messageAttachments, error: messageAttachmentsError } = await supabase
    .from("commerce_chat_messages")
    .select("thread_id, attachment_url")
    .in("thread_id", threadIds)
    .not("attachment_url", "is", null)

  if (messageAttachmentsError) {
    return {
      ok: false as const,
      error: messageAttachmentsError.message || "Gagal membaca lampiran commerce chat yang siap dipurge.",
      scannedThreadCount: threadIds.length,
      removedAttachmentCount: 0,
      purgedThreadCount: 0,
      attachmentDeleteErrors: [] as string[],
    }
  }

  const attachmentCleanup = await removeCommerceChatAttachmentObjects(
    supabase,
    (((messageAttachments as PurgeableMessageAttachmentRow[] | null) || [])).map((row) => row.attachment_url),
  )

  if (attachmentCleanup.errors.length) {
    return {
      ok: false as const,
      error: "Sebagian attachment commerce chat gagal dihapus via Storage API. Purge database dibatalkan agar bisa dicoba ulang dengan aman.",
      scannedThreadCount: threadIds.length,
      removedAttachmentCount: attachmentCleanup.removedCount,
      purgedThreadCount: 0,
      attachmentDeleteErrors: attachmentCleanup.errors,
    }
  }

  const { data: purgedThreadCountRaw, error: purgeError } = await supabase.rpc(
    "purge_deleted_commerce_chat_threads",
  )

  if (purgeError) {
    return {
      ok: false as const,
      error: purgeError.message || "Gagal menjalankan purge thread commerce.",
      scannedThreadCount: threadIds.length,
      removedAttachmentCount: attachmentCleanup.removedCount,
      purgedThreadCount: 0,
      attachmentDeleteErrors: [],
    }
  }

  return {
    ok: true as const,
    error: null,
    scannedThreadCount: threadIds.length,
    removedAttachmentCount: attachmentCleanup.removedCount,
    purgedThreadCount: Number(purgedThreadCountRaw || 0),
    attachmentDeleteErrors: [] as string[],
  }
}
