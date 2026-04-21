import { NextResponse } from "next/server"
import { isFinancePortalRole } from "@/lib/internal-roles"
import { isFinanceNavSeenSection, FINANCE_NAV_SECTION_TO_COLUMN } from "@/lib/finance-nav-seen"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createClient("finance")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile || !isFinancePortalRole(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as { section?: string }
  const section = String(body.section || "").trim().toLowerCase()

  if (!isFinanceNavSeenSection(section)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  const column = FINANCE_NAV_SECTION_TO_COLUMN[section]

  const { error } = await supabase.from("finance_nav_seen_states").upsert(
    {
      finance_user_id: user.id,
      [column]: nowIso,
      updated_at: nowIso,
    },
    {
      onConflict: "finance_user_id",
    },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, section, seenAt: nowIso })
}
