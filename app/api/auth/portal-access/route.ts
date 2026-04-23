import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { ensureAccountRole, hasActiveAccountRole } from "@/lib/account-roles"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const portal = String(searchParams.get("portal") || "").trim().toLowerCase()

  if (portal !== "merchant") {
    return NextResponse.json({ error: "Unsupported portal." }, { status: 400 })
  }

  const supabase = await createClient("merchant")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ hasAccess: false, error: "No active session." }, { status: 401 })
  }

  const adminSupabase = createAdminClient()
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  const { data: merchant } = await adminSupabase
    .from("merchants")
    .select("id, verification_status")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profile?.role === "merchant" && merchant?.id && merchant.verification_status !== "deleted") {
    await ensureAccountRole(adminSupabase, user.id, "merchant", "merchant_portal_legacy_backfill")
  }

  const hasAccess = await hasActiveAccountRole(adminSupabase, user.id, "merchant")
  return NextResponse.json({
    hasAccess,
    profileRole: profile?.role || null,
    merchantStatus: merchant?.verification_status || null,
    merchantId: merchant?.id || null,
  })
}
