import { NextResponse } from "next/server"
import {
  getAdminMerchantSupportAccessProfile,
  loadMerchantSupportMessagesPage,
  loadMerchantSupportRoomsForAdmin,
  MERCHANT_SUPPORT_PAGE_SIZE,
} from "@/lib/merchant-support/index"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const profile = await getAdminMerchantSupportAccessProfile(adminSupabase, user.id)
    if (!profile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = String(searchParams.get("roomId") || "").trim()
    const beforeCreatedAt = String(searchParams.get("beforeCreatedAt") || "").trim()
    const requestedLimit = Number(searchParams.get("limit") || MERCHANT_SUPPORT_PAGE_SIZE)

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 })
    }

    const rooms = await loadMerchantSupportRoomsForAdmin(adminSupabase)
    if (!rooms.some((room) => room.id === roomId)) {
      return NextResponse.json({ error: "Room merchant support tidak ditemukan." }, { status: 404 })
    }

    const page = await loadMerchantSupportMessagesPage(adminSupabase, roomId, {
      beforeCreatedAt: beforeCreatedAt || null,
      limit: requestedLimit,
    })

    return NextResponse.json(page)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat pesan merchant support."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
