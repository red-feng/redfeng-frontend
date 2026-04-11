import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SUPERADMIN_NAV_SECTION_TO_COLUMN, isSuperadminNavSeenSection } from "@/lib/superadmin-nav-seen"

export async function POST(req: Request) {
  const supabase = await createClient()
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

  if (!profile || profile.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as { section?: string }
  const section = String(body.section || "").trim().toLowerCase()

  if (!isSuperadminNavSeenSection(section)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  const column = SUPERADMIN_NAV_SECTION_TO_COLUMN[section]

  const { error } = await supabase.from("superadmin_nav_seen_states").upsert(
    {
      superadmin_user_id: user.id,
      [column]: nowIso,
      updated_at: nowIso,
    },
    {
      onConflict: "superadmin_user_id",
    },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, section, seenAt: nowIso })
}
