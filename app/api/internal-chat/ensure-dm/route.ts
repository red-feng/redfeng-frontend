import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  ensureInternalDirectRoom,
  getInternalChatRoomMetaForUser,
  getInternalProfileById,
  markInternalRoomRead,
  syncInternalChatGroupMemberships,
} from "@/lib/internal-chat"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => null)) as { targetUserId?: string } | null
  const targetUserId = String(body?.targetUserId || "").trim()
  if (!targetUserId) {
    return NextResponse.json({ error: "Akun tujuan tidak valid." }, { status: 400 })
  }

  try {
    await syncInternalChatGroupMemberships(adminSupabase)
    const roomId = await ensureInternalDirectRoom(adminSupabase, user.id, targetUserId)
    await markInternalRoomRead(adminSupabase, roomId, user.id)
    const room = await getInternalChatRoomMetaForUser(adminSupabase, roomId, user.id)
    return NextResponse.json({ roomId, room })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuka chat pribadi." },
      { status: 500 },
    )
  }
}
