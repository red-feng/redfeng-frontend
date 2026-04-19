import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { purgeDeletedCommerceChatThreadsViaStorageApi } from "@/lib/commerce-chat"
import { getRequiredEnv } from "@/lib/env"

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = req.headers.get("authorization")
      const vercelCronHeader = req.headers.get("x-vercel-cron")
      const isTrustedVercelCron = vercelCronHeader === "1"
      if (!isTrustedVercelCron && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const supabase = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    )

    const result = await purgeDeletedCommerceChatThreadsViaStorageApi(supabase, new Date())

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          scanned_thread_count: result.scannedThreadCount,
          removed_attachment_count: result.removedAttachmentCount,
          purged_thread_count: result.purgedThreadCount,
          attachment_delete_errors: result.attachmentDeleteErrors,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      scanned_thread_count: result.scannedThreadCount,
      removed_attachment_count: result.removedAttachmentCount,
      purged_thread_count: result.purgedThreadCount,
      attachment_delete_errors: result.attachmentDeleteErrors,
    })
  } catch (error) {
    console.error("[commerce-chat] storage-api purge cron failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    )
  }
}
