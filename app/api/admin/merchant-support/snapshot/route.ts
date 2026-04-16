import { NextResponse } from "next/server"
import {
  getAdminMerchantSupportAccessProfile,
  getMerchantSupportUnreadCountForAdmin,
  loadMerchantSupportMessages,
  loadMerchantSupportRoomsForAdmin,
  markMerchantSupportRoomReadByAdmin,
} from "@/lib/merchant-support"
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

    const url = new URL(request.url)
    const requestedRoomId = String(url.searchParams.get("roomId") || "").trim()
    const rooms = await loadMerchantSupportRoomsForAdmin(adminSupabase)
    const activeRoomId = requestedRoomId || rooms[0]?.id || ""

    if (activeRoomId) {
      await markMerchantSupportRoomReadByAdmin(adminSupabase, activeRoomId)
    }

    const messages = activeRoomId ? await loadMerchantSupportMessages(adminSupabase, activeRoomId) : []
    const patchedRooms = rooms.map((room) =>
      room.id === activeRoomId ? { ...room, adminLastReadAt: new Date().toISOString() } : room,
    )

    return NextResponse.json({
      rooms: patchedRooms,
      activeRoomId,
      messages,
      unreadCount: getMerchantSupportUnreadCountForAdmin(patchedRooms),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat inbox merchant support."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
