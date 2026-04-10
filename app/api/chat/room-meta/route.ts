import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { parseChatSystemMessage } from "@/lib/chat/system-messages"
import { getCurrentLocale } from "@/lib/locale"

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
      "id, package_id, customer_id, merchant_user_id, booking_id, updated_at, last_message_at, last_message_sender_id, customer_last_read_at, merchant_last_read_at, bookings(booking_code, booking_status, payment_status, customer_name)",
    )
    .eq("id", roomId)
    .single()

  if (error || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  if (room.customer_id !== user.id && room.merchant_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (room.merchant_user_id === user.id) {
    const { data: currentMerchantIds } = await adminSupabase
      .from("merchants")
      .select("id")
      .eq("user_id", user.id)

    const allowedMerchantIds = new Set((currentMerchantIds || []).map((item) => item.id))
    const { data: pkg } = await adminSupabase
      .from("packages")
      .select("id, title, slug, merchant_id, cover_image")
      .eq("id", room.package_id)
      .maybeSingle()

    if (!pkg?.merchant_id || !allowedMerchantIds.has(pkg.merchant_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const booking = Array.isArray(room.bookings) ? room.bookings[0] || null : room.bookings || null
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
      .eq("room_id", room.id)
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
        packageId: room.package_id,
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
        lastMessagePreview: latestMessagePreview,
        updatedAt: room.updated_at || null,
        lastMessageAt: room.last_message_at || null,
        lastMessageSenderId: room.last_message_sender_id || null,
        customerLastReadAt: room.customer_last_read_at || null,
        merchantLastReadAt: room.merchant_last_read_at || null,
      },
    })
  }

  const { data: pkg } = await adminSupabase
    .from("packages")
    .select("id, title, slug, cover_image")
    .eq("id", room.package_id)
    .maybeSingle()

  const booking = Array.isArray(room.bookings) ? room.bookings[0] || null : room.bookings || null
  const { data: merchant } = await adminSupabase
    .from("packages")
    .select("merchant_id, merchants(brand_name, company_name, logo_url)")
    .eq("id", room.package_id)
    .maybeSingle()
  const { data: latestMessage } = await adminSupabase
    .from("package_chat_messages")
    .select("message, attachment_name")
    .eq("room_id", room.id)
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
      packageId: room.package_id,
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
      customerId: room.customer_id,
      merchantUserId: room.merchant_user_id,
      bookingId: room.booking_id || null,
      bookingCode: booking?.booking_code || null,
      bookingStatus: booking?.booking_status || null,
      paymentStatus: booking?.payment_status || null,
      customerName: booking?.customer_name || null,
      lastMessagePreview: latestMessagePreview,
      updatedAt: room.updated_at || null,
      lastMessageAt: room.last_message_at || null,
      lastMessageSenderId: room.last_message_sender_id || null,
      customerLastReadAt: room.customer_last_read_at || null,
      merchantLastReadAt: room.merchant_last_read_at || null,
    },
  })
}
