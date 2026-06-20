import { NextResponse } from "next/server"
import { getFlightExceptionBadgeCount } from "@/lib/flights/exceptionBadge"
import { getAccessibleInternalProducts, hasInternalProductAccess } from "@/lib/internal-product-access"
import { isAdminPortalRole } from "@/lib/internal-roles"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient("admin")
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile || (!isAdminPortalRole(profile.role) && profile.role !== "superadmin")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 })
    }

    const adminSupabase = createAdminClient()
    const accessibleProducts = await getAccessibleInternalProducts(adminSupabase, user.id, profile.role)

    if (!hasInternalProductAccess(accessibleProducts, "flight", "view")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 })
    }

    return NextResponse.json({
      unreadCount: await getFlightExceptionBadgeCount(adminSupabase),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membaca exception pesawat."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
