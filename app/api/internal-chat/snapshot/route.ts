import { NextResponse } from "next/server"
import {
  INTERNAL_CHAT_PAGE_SIZE,
  getInternalProfileById,
  loadInternalChatMessagesPageForUser,
  loadInternalChatRoomsForUser,
} from "@/lib/internal-chat"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ rooms: [], messages: [] }, { status: 401 })
  }

  const profile = await getInternalProfileById(adminSupabase, user.id)
  if (!profile) {
    return NextResponse.json({ rooms: [], messages: [] }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const roomId = String(searchParams.get("roomId") || "").trim()

  try {
    const rooms = await loadInternalChatRoomsForUser(adminSupabase, user.id)
    const shouldLoadMessages = roomId && rooms.some((room) => room.id === roomId)
    const page = shouldLoadMessages
      ? await loadInternalChatMessagesPageForUser(adminSupabase, roomId, user.id, {
          limit: INTERNAL_CHAT_PAGE_SIZE,
        })
      : { messages: [], hasMore: false, oldestCreatedAt: null as string | null }

    return NextResponse.json({
      rooms,
      messages: page.messages,
      hasMore: page.hasMore,
      oldestCreatedAt: page.oldestCreatedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat snapshot chat internal."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
