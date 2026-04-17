import { NextResponse } from "next/server"
import { resolvePackageChatActorRole } from "@/lib/chat/package-chat-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { groupChatThreadRooms, buildChatThreadKey } from "@/lib/chat/thread-group"

const CHAT_PAGE_SIZE = 50

type ChatMessageRow = {
  id: string
  room_id: string
  sender_id: string
  message: string
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_mime_type?: string | null
  created_at: string | null
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const roomId = String(searchParams.get("roomId") || "").trim()
  const beforeCreatedAt = String(searchParams.get("beforeCreatedAt") || "").trim()
  const requestedLimit = Number(searchParams.get("limit") || CHAT_PAGE_SIZE)
  const safeLimit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 10), 200)
    : CHAT_PAGE_SIZE

  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 })
  }

  const { data: room, error: roomError } = await adminSupabase
    .from("package_chat_rooms")
    .select("id, package_id, customer_id, merchant_user_id")
    .eq("id", roomId)
    .maybeSingle()

  if (roomError || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  const actorRole = await resolvePackageChatActorRole(adminSupabase, user.id, room)
  if (!actorRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: threadRoomRows, error: threadRoomsError } = await adminSupabase
    .from("package_chat_rooms")
    .select("id, package_id, customer_id, merchant_user_id, booking_id, updated_at, last_message_at, last_message_sender_id, customer_last_read_at, merchant_last_read_at")
    .eq("package_id", room.package_id)
    .eq("customer_id", room.customer_id)
    .eq("merchant_user_id", room.merchant_user_id)

  if (threadRoomsError) {
    return NextResponse.json({ error: threadRoomsError.message || "Failed to resolve thread rooms" }, { status: 500 })
  }

  const threadGroup = groupChatThreadRooms((threadRoomRows as Array<{
    id: string
    package_id: string
    customer_id: string
    merchant_user_id: string
    booking_id?: string | null
    updated_at?: string | null
    last_message_at?: string | null
    last_message_sender_id?: string | null
    customer_last_read_at?: string | null
    merchant_last_read_at?: string | null
  }> | null) || []).find((group) => group.key === buildChatThreadKey(room))
  const threadRoomIds = threadGroup?.roomIds || [room.id]

  let query = adminSupabase
    .from("package_chat_messages")
    .select("id, room_id, sender_id, message, attachment_url, attachment_name, attachment_mime_type, created_at")
    .in("room_id", threadRoomIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit + 1)

  if (beforeCreatedAt) {
    query = query.lt("created_at", beforeCreatedAt)
  }

  const { data: rows, error: messagesError } = await query
  if (messagesError) {
    return NextResponse.json(
      { error: messagesError.message || "Gagal memuat pesan." },
      { status: 500 },
    )
  }

  const descRows = (rows as ChatMessageRow[] | null) || []
  const hasMore = descRows.length > safeLimit
  const limitedRows = hasMore ? descRows.slice(0, safeLimit) : descRows
  const messages = [...limitedRows].sort((left, right) => {
    const leftDate = left.created_at || ""
    const rightDate = right.created_at || ""
    if (leftDate === rightDate) return left.id.localeCompare(right.id)
    return leftDate.localeCompare(rightDate)
  })

  return NextResponse.json({
    messages,
    hasMore,
    oldestCreatedAt: messages[0]?.created_at || null,
  })
}
