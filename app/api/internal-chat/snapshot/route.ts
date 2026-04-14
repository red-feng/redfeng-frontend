import { NextResponse } from "next/server"
import {
  getInternalProfileById,
  loadInternalChatMessagesForUser,
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
    const messages = shouldLoadMessages
      ? await loadInternalChatMessagesForUser(adminSupabase, roomId, user.id)
      : []

    return NextResponse.json({ rooms, messages })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat snapshot chat internal."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
