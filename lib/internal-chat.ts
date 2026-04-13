import { getRoleLabel, isInternalRole } from "@/lib/internal-roles"

type AdminSupabase = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>

type InternalProfileRow = {
  id: string
  username: string | null
  role: string | null
}

type InternalChatRoomRow = {
  id: string
  room_scope: string
  group_code: string | null
  name: string | null
  description: string | null
  updated_at: string | null
  last_message_at: string | null
  last_message_sender_id: string | null
}

type InternalChatMemberRow = {
  room_id: string
  user_id: string
  last_read_at: string | null
}

type InternalChatMessagePreviewRow = {
  room_id: string
  message: string
  created_at: string | null
}

type InternalChatMessageRow = {
  id: string
  room_id: string
  sender_id: string
  message: string
  created_at: string | null
}

export type InternalChatRoomItem = {
  id: string
  roomScope: "dm"
  title: string
  subtitle: string | null
  participantCount: number
  updatedAt: string | null
  lastMessageAt: string | null
  lastMessageSenderId: string | null
  currentUserLastReadAt: string | null
  lastMessagePreview: string | null
  otherUserId: string | null
  otherUsername: string | null
  otherUserRole: string | null
}

export type InternalChatMessageItem = InternalChatMessageRow

export type InternalChatUserOption = {
  id: string
  username: string
  role: string
}

function buildDirectRoomKey(leftUserId: string, rightUserId: string) {
  const [a, b] = [leftUserId, rightUserId].sort((x, y) => x.localeCompare(y))
  return `dm:${a}:${b}`
}

function sortRoomsByActivity(rooms: InternalChatRoomItem[]) {
  return [...rooms].sort((left, right) => {
    const leftDate = left.lastMessageAt || left.updatedAt || ""
    const rightDate = right.lastMessageAt || right.updatedAt || ""
    return rightDate.localeCompare(leftDate)
  })
}

async function getInternalProfiles(adminSupabase: AdminSupabase) {
  const roles = ["admin", "operations_manager", "finance", "finance_manager", "superadmin"]
  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, username, role")
    .in("role", roles)

  if (error) {
    throw new Error(error.message || "Gagal membaca profil internal.")
  }

  return (data as InternalProfileRow[] | null) || []
}

export async function getInternalProfileById(adminSupabase: AdminSupabase, userId: string) {
  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, username, role")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || "Gagal membaca profil akun.")
  }

  const profile = data as InternalProfileRow | null
  if (!profile || !isInternalRole(profile.role)) {
    return null
  }

  return profile
}


export async function ensureInternalDirectRoom(
  adminSupabase: AdminSupabase,
  actorUserId: string,
  targetUserId: string,
) {
  if (!targetUserId || actorUserId === targetUserId) {
    throw new Error("Akun tujuan chat pribadi tidak valid.")
  }

  const profiles = await Promise.all([
    getInternalProfileById(adminSupabase, actorUserId),
    getInternalProfileById(adminSupabase, targetUserId),
  ])

  if (!profiles[0] || !profiles[1]) {
    throw new Error("Chat pribadi hanya untuk akun internal yang valid.")
  }

  const roomKey = buildDirectRoomKey(actorUserId, targetUserId)

  const { data: existingRoom, error: existingRoomError } = await adminSupabase
    .from("internal_chat_rooms")
    .select("id")
    .eq("room_scope", "dm")
    .eq("room_key", roomKey)
    .maybeSingle()

  if (existingRoomError) {
    throw new Error(existingRoomError.message || "Gagal membaca room chat pribadi.")
  }

  let roomId = (existingRoom as { id: string } | null)?.id || ""
  if (!roomId) {
    const { data: createdRoom, error: createdRoomError } = await adminSupabase
      .from("internal_chat_rooms")
      .insert({
        room_scope: "dm",
        room_key: roomKey,
        created_by: actorUserId,
      })
      .select("id")
      .single()

    if (createdRoomError || !createdRoom?.id) {
      throw new Error(createdRoomError?.message || "Gagal membuat room chat pribadi.")
    }

    roomId = createdRoom.id
  }

  const { error: memberError } = await adminSupabase
    .from("internal_chat_room_members")
    .upsert(
      [
        { room_id: roomId, user_id: actorUserId },
        { room_id: roomId, user_id: targetUserId },
      ],
      { onConflict: "room_id,user_id", ignoreDuplicates: true },
    )

  if (memberError) {
    throw new Error(memberError.message || "Gagal menyiapkan member chat pribadi.")
  }

  return roomId
}

async function getRoomMembersByRoomId(adminSupabase: AdminSupabase, roomIds: string[]) {
  if (roomIds.length === 0) return [] as InternalChatMemberRow[]

  const { data, error } = await adminSupabase
    .from("internal_chat_room_members")
    .select("room_id, user_id, last_read_at")
    .in("room_id", roomIds)

  if (error) {
    throw new Error(error.message || "Gagal membaca member room internal.")
  }

  return (data as InternalChatMemberRow[] | null) || []
}

async function getLatestMessageMap(adminSupabase: AdminSupabase, roomIds: string[]) {
  if (roomIds.length === 0) return new Map<string, InternalChatMessagePreviewRow>()

  const { data, error } = await adminSupabase
    .from("internal_chat_messages")
    .select("room_id, message, created_at")
    .in("room_id", roomIds)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message || "Gagal membaca pesan terakhir room internal.")
  }

  const latestMap = new Map<string, InternalChatMessagePreviewRow>()
  for (const row of (data as InternalChatMessagePreviewRow[] | null) || []) {
    if (!row.room_id || latestMap.has(row.room_id)) continue
    latestMap.set(row.room_id, row)
  }
  return latestMap
}

export async function markInternalRoomRead(
  adminSupabase: AdminSupabase,
  roomId: string,
  userId: string,
  readAtIso = new Date().toISOString(),
) {
  const { error } = await adminSupabase
    .from("internal_chat_room_members")
    .update({ last_read_at: readAtIso })
    .eq("room_id", roomId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message || "Gagal update status baca room internal.")
  }
}

export async function loadInternalChatRoomsForUser(adminSupabase: AdminSupabase, userId: string) {
  const { data: membershipRows, error: membershipError } = await adminSupabase
    .from("internal_chat_room_members")
    .select("room_id, user_id, last_read_at")
    .eq("user_id", userId)

  if (membershipError) {
    throw new Error(membershipError.message || "Gagal membaca membership room internal.")
  }

  const memberships = (membershipRows as InternalChatMemberRow[] | null) || []
  const roomIds = memberships.map((row) => row.room_id)

  if (roomIds.length === 0) return [] as InternalChatRoomItem[]

  const { data: roomRows, error: roomsError } = await adminSupabase
    .from("internal_chat_rooms")
    .select("id, room_scope, group_code, name, description, updated_at, last_message_at, last_message_sender_id")
    .in("id", roomIds)
    .eq("room_scope", "dm")

  if (roomsError) {
    throw new Error(roomsError.message || "Gagal membaca room internal.")
  }

  const rooms = (roomRows as InternalChatRoomRow[] | null) || []
  const allMembers = await getRoomMembersByRoomId(adminSupabase, roomIds)
  const latestMessageMap = await getLatestMessageMap(adminSupabase, roomIds)
  const uniqueUserIds = [...new Set(allMembers.map((member) => member.user_id))]

  const { data: profileRows, error: profileError } = uniqueUserIds.length
    ? await adminSupabase
        .from("profiles")
        .select("id, username, role")
        .in("id", uniqueUserIds)
    : { data: [], error: null as { message?: string } | null }

  if (profileError) {
    throw new Error(profileError.message || "Gagal membaca profil member room internal.")
  }

  const profileMap = new Map<string, InternalProfileRow>()
  for (const profile of (profileRows as InternalProfileRow[] | null) || []) {
    profileMap.set(profile.id, profile)
  }

  const memberMap = new Map<string, InternalChatMemberRow[]>()
  for (const member of allMembers) {
    const members = memberMap.get(member.room_id) || []
    members.push(member)
    memberMap.set(member.room_id, members)
  }

  const readMap = new Map<string, string | null>()
  for (const membership of memberships) {
    readMap.set(membership.room_id, membership.last_read_at || null)
  }

  const result: InternalChatRoomItem[] = rooms.map((room) => {
    const roomMembers = memberMap.get(room.id) || []
    const latest = latestMessageMap.get(room.id)
    const otherMember = roomMembers.find((member) => member.user_id !== userId) || null
    const otherProfile = otherMember ? profileMap.get(otherMember.user_id) || null : null
    const dmTitle = otherProfile?.username || `User ${String(otherMember?.user_id || "").slice(0, 8)}`
    const subtitle = otherProfile?.role ? getRoleLabel(otherProfile.role) : null

    return {
      id: room.id,
      roomScope: "dm",
      title: dmTitle,
      subtitle,
      participantCount: roomMembers.length,
      updatedAt: room.updated_at || null,
      lastMessageAt: room.last_message_at || null,
      lastMessageSenderId: room.last_message_sender_id || null,
      currentUserLastReadAt: readMap.get(room.id) || null,
      lastMessagePreview: latest?.message || null,
      otherUserId: otherMember?.user_id || null,
      otherUsername: otherProfile?.username || null,
      otherUserRole: otherProfile?.role || null,
    }
  })

  return sortRoomsByActivity(result)
}

export async function loadInternalChatMessagesForUser(adminSupabase: AdminSupabase, roomId: string, userId: string) {
  const { data: memberRow, error: memberError } = await adminSupabase
    .from("internal_chat_room_members")
    .select("room_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle()

  if (memberError) {
    throw new Error(memberError.message || "Gagal verifikasi akses room internal.")
  }
  if (!memberRow) {
    throw new Error("Anda tidak punya akses ke room internal ini.")
  }

  const { data: messages, error: messagesError } = await adminSupabase
    .from("internal_chat_messages")
    .select("id, room_id, sender_id, message, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })

  if (messagesError) {
    throw new Error(messagesError.message || "Gagal membaca pesan room internal.")
  }

  return (messages as InternalChatMessageItem[] | null) || []
}

export async function getInternalChatRoomMetaForUser(adminSupabase: AdminSupabase, roomId: string, userId: string) {
  const rooms = await loadInternalChatRoomsForUser(adminSupabase, userId)
  return rooms.find((room) => room.id === roomId) || null
}

export async function listInternalChatUsers(adminSupabase: AdminSupabase, currentUserId: string) {
  const profiles = await getInternalProfiles(adminSupabase)
  return profiles
    .filter((profile) => profile.id !== currentUserId)
    .map((profile) => ({
      id: profile.id,
      username: profile.username || `user-${profile.id.slice(0, 8)}`,
      role: getRoleLabel(profile.role),
    }))
    .sort((left, right) => left.username.localeCompare(right.username))
}
