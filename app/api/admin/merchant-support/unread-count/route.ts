import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  getAdminMerchantSupportAccessProfile,
  getMerchantSupportUnreadCountForAdmin,
  loadMerchantSupportRoomsForAdmin,
} from "@/lib/merchant-support/index"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }

    const adminSupabase = createAdminClient()
    const profile = await getAdminMerchantSupportAccessProfile(adminSupabase, user.id)

    if (!profile) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 })
    }

    const rooms = await loadMerchantSupportRoomsForAdmin(adminSupabase)
    return NextResponse.json({ unreadCount: getMerchantSupportUnreadCountForAdmin(rooms) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membaca unread merchant support."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
