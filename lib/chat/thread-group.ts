type ChatThreadRoomBase = {
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
  customer_hidden_at?: string | null
  merchant_hidden_at?: string | null
}

export type ChatThreadGroup<T extends ChatThreadRoomBase> = {
  key: string
  representative: T
  rooms: T[]
  roomIds: string[]
}

export function buildChatThreadKey(room: Pick<ChatThreadRoomBase, "package_id" | "customer_id" | "merchant_user_id">) {
  return `${room.package_id}::${room.customer_id}::${room.merchant_user_id}`
}

function compareIsoDesc(left: string | null | undefined, right: string | null | undefined) {
  return String(right || "").localeCompare(String(left || ""))
}

function chooseRepresentativeRoom<T extends ChatThreadRoomBase>(rooms: T[]) {
  return [...rooms].sort((left, right) => {
    const updatedComparison = compareIsoDesc(left.updated_at, right.updated_at)
    if (updatedComparison !== 0) return updatedComparison

    const lastMessageComparison = compareIsoDesc(left.last_message_at, right.last_message_at)
    if (lastMessageComparison !== 0) return lastMessageComparison

    if (left.booking_id && !right.booking_id) return -1
    if (!left.booking_id && right.booking_id) return 1
    return right.id.localeCompare(left.id)
  })[0]
}

export function groupChatThreadRooms<T extends ChatThreadRoomBase>(rooms: T[]) {
  const groups = new Map<string, T[]>()

  for (const room of rooms) {
    const key = buildChatThreadKey(room)
    const current = groups.get(key)
    if (current) {
      current.push(room)
    } else {
      groups.set(key, [room])
    }
  }

  return [...groups.entries()]
    .map(([key, groupedRooms]) => {
      const representative = chooseRepresentativeRoom(groupedRooms)
      return {
        key,
        representative: {
          ...representative,
          updated_at: groupedRooms.map((room) => room.updated_at || "").sort().at(-1) || representative.updated_at || null,
          last_message_at:
            groupedRooms.map((room) => room.last_message_at || "").sort().at(-1) || representative.last_message_at || null,
          customer_last_read_at:
            groupedRooms.map((room) => room.customer_last_read_at || "").sort().at(-1) || representative.customer_last_read_at || null,
          merchant_last_read_at:
            groupedRooms.map((room) => room.merchant_last_read_at || "").sort().at(-1) || representative.merchant_last_read_at || null,
          customer_hidden_at:
            groupedRooms.every((room) => room.customer_hidden_at) ? representative.customer_hidden_at || null : null,
          merchant_hidden_at:
            groupedRooms.every((room) => room.merchant_hidden_at) ? representative.merchant_hidden_at || null : null,
        } as T,
        rooms: groupedRooms,
        roomIds: groupedRooms.map((room) => room.id),
      } satisfies ChatThreadGroup<T>
    })
    .sort((left, right) => {
      const updatedComparison = compareIsoDesc(left.representative.updated_at, right.representative.updated_at)
      if (updatedComparison !== 0) return updatedComparison
      const lastMessageComparison = compareIsoDesc(left.representative.last_message_at, right.representative.last_message_at)
      if (lastMessageComparison !== 0) return lastMessageComparison
      return right.representative.id.localeCompare(left.representative.id)
    })
}

export function findChatThreadGroupByRoomId<T extends ChatThreadRoomBase>(rooms: T[], roomId: string) {
  if (!roomId) return null
  return groupChatThreadRooms(rooms).find((group) => group.roomIds.includes(roomId)) || null
}
