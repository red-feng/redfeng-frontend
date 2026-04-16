import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getCurrentLocale } from "@/lib/locale"
import { parseChatSystemMessage } from "@/lib/chat/system-messages"

const DEFAULT_LIMIT = 30

type ChatRoomRow = {
  id: string
  package_id: string
  customer_id: string
  merchant_user_id: string
  booking_id?: string | null
  updated_at: string | null
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
}

type PackageRow = {
  id: string
  package_code: string | null
  title: string | null
  slug: string | null
  merchant_id: string | null
  cover_image: string | null
}

type MerchantRow = {
  id: string
  brand_name: string | null
  company_name: string | null
  logo_url: string | null
}

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

function getBookingInfo(room: ChatRoomRow) {
  if (Array.isArray(room.bookings)) return room.bookings[0] || null
  return room.bookings || null
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
  const mode = String(searchParams.get("mode") || "customer").trim() === "merchant" ? "merchant" : "customer"
  const beforeUpdatedAt = String(searchParams.get("beforeUpdatedAt") || "").trim()
  const beforeRoomId = String(searchParams.get("beforeRoomId") || "").trim()
  const requestedLimit = Number(searchParams.get("limit") || DEFAULT_LIMIT)
  const safeLimit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 10), 100)
    : DEFAULT_LIMIT

  let query = adminSupabase
    .from("package_chat_rooms")
    .select(
      "id, package_id, customer_id, merchant_user_id, booking_id, updated_at, last_message_at, last_message_sender_id, customer_last_read_at, merchant_last_read_at, customer_hidden_at, merchant_hidden_at, bookings(booking_code, booking_status, payment_status, customer_name)",
    )
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(safeLimit + 1)

  if (beforeUpdatedAt && beforeRoomId) {
    query = query.or(`updated_at.lt.${beforeUpdatedAt},and(updated_at.eq.${beforeUpdatedAt},id.lt.${beforeRoomId})`)
  }

  if (mode === "merchant") {
    const { data: currentMerchant } = await adminSupabase
      .from("merchants")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!currentMerchant?.id) {
      return NextResponse.json({ rooms: [], hasMore: false, nextCursor: null })
    }

    query = query.eq("merchant_user_id", user.id)
  } else {
    query = query.eq("customer_id", user.id)
  }

  const { data: roomRows, error: roomsError } = await query
  if (roomsError) {
    return NextResponse.json({ error: roomsError.message || "Gagal memuat daftar room." }, { status: 500 })
  }

  const descRows = (roomRows as ChatRoomRow[] | null) || []
  const hasMore = descRows.length > safeLimit
  const rooms = hasMore ? descRows.slice(0, safeLimit) : descRows
  const nextCursor = hasMore
    ? {
        updatedAt: rooms[rooms.length - 1]?.updated_at || null,
        roomId: rooms[rooms.length - 1]?.id || null,
      }
    : null

  const packageIds = [...new Set(rooms.map((room) => room.package_id).filter(Boolean))]
  const { data: packageRows } = packageIds.length
    ? await adminSupabase
        .from("packages")
        .select("id, package_code, title, slug, merchant_id, cover_image")
        .in("id", packageIds)
    : { data: [] as PackageRow[] }
  const packageMap = new Map((packageRows || []).map((p: PackageRow) => [p.id, p]))

  const merchantIds = [...new Set((packageRows || []).map((pkg) => pkg.merchant_id).filter(Boolean))]
  const { data: merchantRows } = merchantIds.length
    ? await adminSupabase
        .from("merchants")
        .select("id, brand_name, company_name, logo_url")
        .in("id", merchantIds)
    : { data: [] as MerchantRow[] }
  const merchantMap = new Map((merchantRows || []).map((m: MerchantRow) => [m.id, m]))

  const roomIds = rooms.map((room) => room.id)
  const { data: latestMessageRows } = roomIds.length
    ? await adminSupabase
        .from("package_chat_messages")
        .select("room_id, message, attachment_name, created_at")
        .in("room_id", roomIds)
        .order("created_at", { ascending: false })
    : { data: [] as Array<{ room_id: string; message: string; attachment_name?: string | null; created_at?: string | null }> }

  const latestMessageMap = new Map<string, string>()
  for (const row of latestMessageRows || []) {
    if (!row.room_id || latestMessageMap.has(row.room_id)) continue
    const systemMessage = parseChatSystemMessage(row.message)
    let preview = row.message || ""
    if (systemMessage?.type === "package_inquiry") {
      preview = getSystemPreviewText("package_inquiry", locale, mode)
    } else if (systemMessage?.type === "booking_linked") {
      preview = getSystemPreviewText("booking_linked", locale, mode)
    } else if (!preview && row.attachment_name) {
      preview = row.attachment_name
    }
    latestMessageMap.set(row.room_id, preview)
  }

  const payloadRooms = rooms.map((room) => {
    const pkg = packageMap.get(room.package_id)
    const merchant = pkg?.merchant_id ? merchantMap.get(pkg.merchant_id) : null
    const booking = getBookingInfo(room)
    return {
      id: room.id,
      packageId: room.package_id,
      packageCode: pkg?.package_code || null,
      packageTitle: pkg?.title || null,
      packageSlug: pkg?.slug || null,
      packageCoverImage: pkg?.cover_image || null,
      merchantName: merchant?.brand_name || merchant?.company_name || null,
      merchantLogoUrl: merchant?.logo_url || null,
      customerId: room.customer_id,
      merchantUserId: room.merchant_user_id,
      bookingId: room.booking_id || null,
      bookingCode: booking?.booking_code || null,
      bookingStatus: booking?.booking_status || null,
      paymentStatus: booking?.payment_status || null,
      customerName: booking?.customer_name || null,
      lastMessagePreview: latestMessageMap.get(room.id) || null,
      updatedAt: room.updated_at || null,
      lastMessageAt: room.last_message_at || null,
      lastMessageSenderId: room.last_message_sender_id || null,
      customerLastReadAt: room.customer_last_read_at || null,
      merchantLastReadAt: room.merchant_last_read_at || null,
    }
  })

  return NextResponse.json({
    rooms: payloadRooms,
    hasMore,
    nextCursor,
  })
}
