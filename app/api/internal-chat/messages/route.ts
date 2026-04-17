import { NextResponse } from "next/server"
import {
  INTERNAL_CHAT_PAGE_SIZE,
  getInternalProfileById,
  loadInternalChatMessagesPageForUser,
} from "@/lib/internal-chat/index"
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

  const profile = await getInternalProfileById(adminSupabase, user.id)
  if (!profile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const roomId = String(searchParams.get("roomId") || "").trim()
  const beforeCreatedAt = String(searchParams.get("beforeCreatedAt") || "").trim()
  const requestedLimit = Number(searchParams.get("limit") || INTERNAL_CHAT_PAGE_SIZE)

  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 })
  }

  try {
    const page = await loadInternalChatMessagesPageForUser(adminSupabase, roomId, user.id, {
      beforeCreatedAt: beforeCreatedAt || null,
      limit: requestedLimit,
    })
    return NextResponse.json(page)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat pesan room internal."
    const status = message.includes("akses") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
