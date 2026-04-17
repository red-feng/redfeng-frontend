type AdminSupabase = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>

type InternalChatMemberRow = {
  room_id: string
  last_read_at: string | null
}

type InternalChatRoomUnreadRow = {
  id: string
  last_message_at: string | null
  last_message_sender_id: string | null
}

function isUnreadRoomForUser(room: InternalChatRoomUnreadRow, lastReadAt: string | null, userId: string) {
  if (!room.last_message_at) return false
  if (!room.last_message_sender_id || room.last_message_sender_id === userId) return false
  if (!lastReadAt) return true

  const lastMessageTs = Date.parse(room.last_message_at)
  const lastReadTs = Date.parse(lastReadAt)
  if (Number.isNaN(lastMessageTs) || Number.isNaN(lastReadTs)) {
    return room.last_message_at > lastReadAt
  }

  return lastMessageTs > lastReadTs
}

export async function getInternalChatUnreadBadgeCount(adminSupabase: AdminSupabase, userId: string) {
  const { data: memberRows, error: memberError } = await adminSupabase
    .from("internal_chat_room_members")
    .select("room_id, last_read_at")
    .eq("user_id", userId)

  if (memberError) {
    return 0
  }

  const memberships = (memberRows as InternalChatMemberRow[] | null) || []
  const roomIds = memberships.map((member) => member.room_id)
  if (roomIds.length === 0) return 0

  const { data: roomRows, error: roomError } = await adminSupabase
    .from("internal_chat_rooms")
    .select("id, last_message_at, last_message_sender_id")
    .in("id", roomIds)
    .eq("room_scope", "dm")

  if (roomError) {
    return 0
  }

  const roomMap = new Map<string, InternalChatRoomUnreadRow>()
  for (const room of (roomRows as InternalChatRoomUnreadRow[] | null) || []) {
    roomMap.set(room.id, room)
  }

  let unreadCount = 0
  for (const membership of memberships) {
    const room = roomMap.get(membership.room_id)
    if (!room) continue
    if (isUnreadRoomForUser(room, membership.last_read_at, userId)) {
      unreadCount += 1
    }
  }

  return unreadCount
}

