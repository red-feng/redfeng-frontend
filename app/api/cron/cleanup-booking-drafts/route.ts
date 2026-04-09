import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getRequiredEnv } from "@/lib/env"
import {
  runExpiredBookingCleanup,
} from "@/lib/bookings/draft-cleanup"

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

    const result = await runExpiredBookingCleanup(supabase, new Date())

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      deleted_count: result.deletedCount,
      routed_to_refund_review_count: result.routedToRefundReviewCount,
      deleted_by_h3_deadline_count: result.expiredByDeadlineCount,
      deleted_by_draft_expiry_count: result.expiredByDraftExpiryCount,
      scanned_count: result.scannedCount,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    )
  }
}
