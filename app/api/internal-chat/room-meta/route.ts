import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getInternalChatRoomMetaForUser, getInternalProfileById } from "@/lib/internal-chat"
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

  const profile = await getInternalProfileById(adminSupabase, user.id)
  if (!profile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const roomId = String(searchParams.get("roomId") || "").trim()
  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 })
  }

  try {
    const room = await getInternalChatRoomMetaForUser(adminSupabase, roomId, user.id)
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }
    return NextResponse.json({ room })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load room meta." },
      { status: 500 },
    )
  }
}
