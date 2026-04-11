import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getRequiredEnv } from "@/lib/env"
import { runExpiredMerchantRevisionCleanup } from "@/lib/merchant-review-cleanup"

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

    const result = await runExpiredMerchantRevisionCleanup(supabase, new Date())

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      scanned_count: result.scannedCount,
      purged_count: result.purgedCount,
      failed_count: result.failedCount,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    )
  }
}
