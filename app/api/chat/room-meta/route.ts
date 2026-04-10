import { NextResponse } from "next/server"
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

    return NextResponse.json({
      room: {
        id: room.id,
        packageId: room.package_id,
        packageTitle: pkg?.title || null,
        packageSlug: pkg?.slug || null,
        packageCoverImage: pkg?.cover_image || null,
        customerId: room.customer_id,
        merchantUserId: room.merchant_user_id,
        bookingId: room.booking_id || null,
        bookingCode: booking?.booking_code || null,
        bookingStatus: booking?.booking_status || null,
        paymentStatus: booking?.payment_status || null,
        customerName: booking?.customer_name || null,
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

  return NextResponse.json({
    room: {
      id: room.id,
      packageId: room.package_id,
      packageTitle: pkg?.title || null,
      packageSlug: pkg?.slug || null,
      packageCoverImage: pkg?.cover_image || null,
      customerId: room.customer_id,
      merchantUserId: room.merchant_user_id,
      bookingId: room.booking_id || null,
      bookingCode: booking?.booking_code || null,
      bookingStatus: booking?.booking_status || null,
      paymentStatus: booking?.payment_status || null,
      customerName: booking?.customer_name || null,
      updatedAt: room.updated_at || null,
      lastMessageAt: room.last_message_at || null,
      lastMessageSenderId: room.last_message_sender_id || null,
      customerLastReadAt: room.customer_last_read_at || null,
      merchantLastReadAt: room.merchant_last_read_at || null,
    },
  })
}
