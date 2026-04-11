import { NextResponse } from "next/server"
import { isMerchantNavSeenSection, MERCHANT_NAV_SECTION_TO_COLUMN } from "@/lib/merchant-nav-seen"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { section?: string }
  const section = String(body.section || "").trim().toLowerCase()

  if (!isMerchantNavSeenSection(section)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 })
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!merchant?.id) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 })
  }

  const nowIso = new Date().toISOString()
  const column = MERCHANT_NAV_SECTION_TO_COLUMN[section]

  const { error } = await supabase.from("merchant_nav_seen_states").upsert(
    {
      merchant_user_id: user.id,
      merchant_id: merchant.id,
      [column]: nowIso,
      updated_at: nowIso,
    },
    {
      onConflict: "merchant_user_id",
    },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, section, seenAt: nowIso })
}
