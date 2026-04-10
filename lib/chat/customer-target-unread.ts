import type { SupabaseClient } from "@supabase/supabase-js"

type TargetRoomRow = {
  id: string
  customer_last_read_at: string | null
}

async function findTargetRoom(
  supabase: SupabaseClient,
  params: {
    customerId: string
    bookingId?: string | null
    packageId?: string | null
  },
) {
  if (params.bookingId) {
    const { data: bookingRoom } = await supabase
      .from("package_chat_rooms")
      .select("id, customer_last_read_at")
      .eq("customer_id", params.customerId)
      .eq("booking_id", params.bookingId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<TargetRoomRow>()

    if (bookingRoom?.id) return bookingRoom
  }

  if (!params.packageId) return null

  const { data: packageRoom } = await supabase
    .from("package_chat_rooms")
    .select("id, customer_last_read_at")
    .eq("customer_id", params.customerId)
    .eq("package_id", params.packageId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<TargetRoomRow>()

  return packageRoom || null
}

export async function getCustomerTargetUnreadCount(
  supabase: SupabaseClient,
  params: {
    customerId: string
    bookingId?: string | null
    packageId?: string | null
  },
) {
  const room = await findTargetRoom(supabase, params)
  if (!room?.id) return 0

  let countQuery = supabase
    .from("package_chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id)
    .neq("sender_id", params.customerId)

  if (room.customer_last_read_at) {
    countQuery = countQuery.gt("created_at", room.customer_last_read_at)
  }

  const { count } = await countQuery
  return Number(count || 0)
}
