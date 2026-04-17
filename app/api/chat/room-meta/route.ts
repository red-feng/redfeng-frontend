import { NextResponse } from "next/server"
import { resolvePackageChatActorRole } from "@/lib/chat/package-chat-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { parseChatSystemMessage } from "@/lib/chat/system-messages"
import { getCurrentLocale } from "@/lib/locale"
import { buildChatThreadKey, groupChatThreadRooms } from "@/lib/chat/thread-group"

function getSystemPreviewText(
  type: "package_inquiry" | "booking_linked",
  locale: "id" | "en" | "zh",
  audience: "customer" | "merchant",
) {
  if (type === "package_inquiry") {
    if (audience === "merchant") {
      return locale === "en"
        ? "Customer asked about this package"
        : locale === "zh"
          ? "该客户正在咨询这个套餐"
          : "Customer bertanya tentang paket ini"
    }

    return locale === "en"
      ? "You asked about this package"
      : locale === "zh"
        ? "你正在咨询这个套餐"
        : "Kamu menanyakan paket ini"
  }

  if (audience === "merchant") {
    return locale === "en"
      ? "Order linked in this chat"
      : locale === "zh"
        ? "此聊天已关联订单"
        : "Pesanan sudah terhubung di chat ini"
  }

  return locale === "en"
    ? "Your order is linked to this chat"
    : locale === "zh"
      ? "此聊天已关联订单"
      : "Pesanan sudah terhubung ke chat ini"
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const locale = await getCurrentLocale()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const roomId = String(searchParams.get("roomId") || "").trim()

  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 })
  }

  const { data: room, error } = await adminSupabase
    .from("package_chat_rooms")
    .select(
      "id, package_id, customer_id, merchant_user_id, booking_id, updated_at, last_message_at, last_message_sender_id, customer_last_read_at, merchant_last_read_at, customer_hidden_at, merchant_hidden_at, bookings(booking_code, booking_status, payment_status, customer_name)",
    )
    .eq("id", roomId)
    .single()

  if (error || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  const actorRole = await resolvePackageChatActorRole(adminSupabase, user.id, room)
  if (!actorRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: threadRoomRows, error: threadRoomsError } = await adminSupabase
    .from("package_chat_rooms")
    .select(
      "id, package_id, customer_id, merchant_user_id, booking_id, updated_at, last_message_at, last_message_sender_id, customer_last_read_at, merchant_last_read_at, customer_hidden_at, merchant_hidden_at, bookings(booking_code, booking_status, payment_status, customer_name)",
    )
    .eq("package_id", room.package_id)
    .eq("customer_id", room.customer_id)
    .eq("merchant_user_id", room.merchant_user_id)

  if (threadRoomsError) {
    return NextResponse.json({ error: threadRoomsError.message || "Failed to resolve thread rooms" }, { status: 500 })
  }

  const groupedRooms = groupChatThreadRooms(
    (threadRoomRows as Array<{
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
      bookings?:
        | {
            booking_code: string | null
            booking_status: string | null
            payment_status: string | null
            customer_name?: string | null
          }
        | {
            booking_code: string | null
            booking_status: string | null
            payment_status: string | null
            customer_name?: string | null
          }[]
        | null
    }> | null) || [],
  )
  const threadKey = buildChatThreadKey(room)
  const threadGroup = groupedRooms.find((group) => group.key === threadKey)
  const representativeRoom = threadGroup?.representative || room
  const threadRoomIds = threadGroup?.roomIds || [room.id]

  if (actorRole === "merchant") {
    const { data: pkg } = await adminSupabase
      .from("packages")
      .select("id, package_code, title, slug, merchant_id, cover_image")
      .eq("id", room.package_id)
      .maybeSingle()

    if (!pkg?.merchant_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const booking = Array.isArray(representativeRoom.bookings) ? representativeRoom.bookings[0] || null : representativeRoom.bookings || null
    const { data: merchant } = pkg?.merchant_id
      ? await adminSupabase
          .from("merchants")
          .select("brand_name, company_name, logo_url")
          .eq("id", pkg.merchant_id)
          .maybeSingle()
      : { data: null as { brand_name?: string | null; company_name?: string | null; logo_url?: string | null } | null }
    const { data: latestMessage } = await adminSupabase
      .from("package_chat_messages")
      .select("message, attachment_name")
      .in("room_id", threadRoomIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const parsedSystemMessage = parseChatSystemMessage(latestMessage?.message)
    const latestMessagePreview =
      parsedSystemMessage?.type === "package_inquiry"
        ? getSystemPreviewText("package_inquiry", locale, "merchant")
        : parsedSystemMessage?.type === "booking_linked"
          ? getSystemPreviewText("booking_linked", locale, "merchant")
          : latestMessage?.message || latestMessage?.attachment_name || null

    return NextResponse.json({
      room: {
        id: room.id,
        packageId: representativeRoom.package_id,
        packageCode: pkg?.package_code || null,
        packageTitle: pkg?.title || null,
        packageSlug: pkg?.slug || null,
        packageCoverImage: pkg?.cover_image || null,
        merchantName: merchant?.brand_name || merchant?.company_name || null,
        merchantLogoUrl: merchant?.logo_url || null,
        customerId: representativeRoom.customer_id,
        merchantUserId: representativeRoom.merchant_user_id,
        bookingId: representativeRoom.booking_id || null,
        bookingCode: booking?.booking_code || null,
        bookingStatus: booking?.booking_status || null,
        paymentStatus: booking?.payment_status || null,
        customerName: booking?.customer_name || null,
        lastMessagePreview: latestMessagePreview,
        updatedAt: representativeRoom.updated_at || null,
        lastMessageAt: representativeRoom.last_message_at || null,
        lastMessageSenderId: representativeRoom.last_message_sender_id || null,
        customerLastReadAt: representativeRoom.customer_last_read_at || null,
        merchantLastReadAt: representativeRoom.merchant_last_read_at || null,
      },
    })
  }

  const { data: pkg } = await adminSupabase
    .from("packages")
    .select("id, package_code, title, slug, cover_image")
    .eq("id", room.package_id)
    .maybeSingle()

  const booking = Array.isArray(representativeRoom.bookings) ? representativeRoom.bookings[0] || null : representativeRoom.bookings || null
  const { data: merchant } = await adminSupabase
    .from("packages")
    .select("merchant_id, merchants(brand_name, company_name, logo_url)")
    .eq("id", room.package_id)
    .maybeSingle()
  const { data: latestMessage } = await adminSupabase
    .from("package_chat_messages")
    .select("message, attachment_name")
    .in("room_id", threadRoomIds)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const parsedSystemMessage = parseChatSystemMessage(latestMessage?.message)
  const latestMessagePreview =
    parsedSystemMessage?.type === "package_inquiry"
      ? getSystemPreviewText("package_inquiry", locale, "customer")
      : parsedSystemMessage?.type === "booking_linked"
        ? getSystemPreviewText("booking_linked", locale, "customer")
        : latestMessage?.message || latestMessage?.attachment_name || null

  return NextResponse.json({
    room: {
      id: room.id,
      packageId: representativeRoom.package_id,
      packageCode: pkg?.package_code || null,
      packageTitle: pkg?.title || null,
      packageSlug: pkg?.slug || null,
      packageCoverImage: pkg?.cover_image || null,
      merchantName:
        Array.isArray((merchant as { merchants?: { brand_name?: string | null; company_name?: string | null } | null } | null)?.merchants)
          ? null
          : ((merchant as { merchants?: { brand_name?: string | null; company_name?: string | null; logo_url?: string | null } | null } | null)
              ?.merchants?.brand_name ||
            (merchant as { merchants?: { brand_name?: string | null; company_name?: string | null; logo_url?: string | null } | null } | null)
              ?.merchants?.company_name ||
            null),
      merchantLogoUrl:
        Array.isArray((merchant as { merchants?: { logo_url?: string | null } | null } | null)?.merchants)
          ? null
          : ((merchant as { merchants?: { logo_url?: string | null } | null } | null)?.merchants?.logo_url || null),
      customerId: representativeRoom.customer_id,
      merchantUserId: representativeRoom.merchant_user_id,
      bookingId: representativeRoom.booking_id || null,
      bookingCode: booking?.booking_code || null,
      bookingStatus: booking?.booking_status || null,
      paymentStatus: booking?.payment_status || null,
      customerName: booking?.customer_name || null,
      lastMessagePreview: latestMessagePreview,
      updatedAt: representativeRoom.updated_at || null,
      lastMessageAt: representativeRoom.last_message_at || null,
      lastMessageSenderId: representativeRoom.last_message_sender_id || null,
      customerLastReadAt: representativeRoom.customer_last_read_at || null,
      merchantLastReadAt: representativeRoom.merchant_last_read_at || null,
    },
  })
}
