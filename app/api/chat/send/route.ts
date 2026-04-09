import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { uploadChatAttachment } from "@/lib/chat/attachments"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()

  let roomId = String(formData.get("room_id") || "").trim()
  const packageId = String(formData.get("package_id") || "").trim()
  const bookingId = String(formData.get("booking_id") || "").trim()
  const message = String(formData.get("message") || "").trim()
  const attachmentFile = formData.get("attachment")
  const attachment = attachmentFile instanceof File ? attachmentFile : null

  if (!message && (!attachment || attachment.size <= 0)) {
    return NextResponse.json({ error: "Pesan atau lampiran wajib diisi." }, { status: 400 })
  }

  if (!roomId) {
    if (bookingId) {
      const { data: booking, error: bookingError } = await adminSupabase
        .from("bookings")
        .select("id, package_id, customer_email")
        .eq("id", bookingId)
        .single()

      if (bookingError || !booking?.package_id || !user.email || booking.customer_email !== user.email) {
        return NextResponse.json({ error: "Booking tidak valid untuk chat." }, { status: 400 })
      }

      const { data: pkg, error: packageError } = await adminSupabase
        .from("packages")
        .select("id, merchant_id")
        .eq("id", booking.package_id)
        .single()

      if (packageError || !pkg?.merchant_id) {
        return NextResponse.json({ error: "Package tidak valid untuk chat." }, { status: 400 })
      }

      const { data: merchantOwner, error: merchantError } = await adminSupabase
        .from("merchants")
        .select("user_id")
        .eq("id", pkg.merchant_id)
        .single()

      if (merchantError || !merchantOwner?.user_id) {
        return NextResponse.json({ error: "Merchant belum siap menerima chat." }, { status: 400 })
      }

      const { data: existingRoom } = await adminSupabase
        .from("package_chat_rooms")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("customer_id", user.id)
        .eq("merchant_user_id", merchantOwner.user_id)
        .maybeSingle()

      if (existingRoom?.id) {
        roomId = existingRoom.id
      } else {
        const { data: sourceRoom } = await adminSupabase
          .from("package_chat_rooms")
          .select("id")
          .eq("package_id", booking.package_id)
          .eq("customer_id", user.id)
          .eq("merchant_user_id", merchantOwner.user_id)
          .is("booking_id", null)
          .maybeSingle()

        const nowIso = new Date().toISOString()
        let { data: newRoom, error: createRoomError } = await adminSupabase
          .from("package_chat_rooms")
          .insert({
            package_id: booking.package_id,
            customer_id: user.id,
            merchant_user_id: merchantOwner.user_id,
            booking_id: bookingId,
            source_room_id: sourceRoom?.id || null,
            customer_last_read_at: nowIso,
          })
          .select("id")
          .single()

        if (createRoomError && createRoomError.message.includes("source_room_id")) {
          const fallbackRoom = await adminSupabase
            .from("package_chat_rooms")
            .insert({
              package_id: booking.package_id,
              customer_id: user.id,
              merchant_user_id: merchantOwner.user_id,
              booking_id: bookingId,
              customer_last_read_at: nowIso,
            })
            .select("id")
            .single()
          newRoom = fallbackRoom.data
          createRoomError = fallbackRoom.error
        }

        if (createRoomError && createRoomError.message.includes("customer_last_read_at")) {
          const fallbackRoom = await adminSupabase
            .from("package_chat_rooms")
            .insert({
              package_id: booking.package_id,
              customer_id: user.id,
              merchant_user_id: merchantOwner.user_id,
              booking_id: bookingId,
              source_room_id: sourceRoom?.id || null,
            })
            .select("id")
            .single()
          newRoom = fallbackRoom.data
          createRoomError = fallbackRoom.error
        }

        if (createRoomError || !newRoom?.id) {
          return NextResponse.json(
            { error: createRoomError?.message || "Ruang chat booking tidak dapat dibuat." },
            { status: 500 },
          )
        }

        roomId = newRoom.id
      }
    } else if (packageId) {
      const { data: pkg, error: packageError } = await adminSupabase
        .from("packages")
        .select("id, merchant_id")
        .eq("id", packageId)
        .single()

      if (packageError || !pkg?.merchant_id) {
        return NextResponse.json({ error: "Package tidak valid untuk chat." }, { status: 400 })
      }

      const { data: merchantOwner, error: merchantError } = await adminSupabase
        .from("merchants")
        .select("user_id")
        .eq("id", pkg.merchant_id)
        .single()

      if (merchantError || !merchantOwner?.user_id) {
        return NextResponse.json({ error: "Merchant belum siap menerima chat." }, { status: 400 })
      }

      const { data: existingRoom } = await adminSupabase
        .from("package_chat_rooms")
        .select("id")
        .eq("package_id", packageId)
        .eq("customer_id", user.id)
        .eq("merchant_user_id", merchantOwner.user_id)
        .is("booking_id", null)
        .maybeSingle()

      if (existingRoom?.id) {
        roomId = existingRoom.id
      } else {
        const nowIso = new Date().toISOString()
        let { data: newRoom, error: createRoomError } = await adminSupabase
          .from("package_chat_rooms")
          .insert({
            package_id: packageId,
            customer_id: user.id,
            merchant_user_id: merchantOwner.user_id,
            customer_last_read_at: nowIso,
          })
          .select("id")
          .single()

        if (createRoomError && createRoomError.message.includes("customer_last_read_at")) {
          const fallbackRoom = await adminSupabase
            .from("package_chat_rooms")
            .insert({
              package_id: packageId,
              customer_id: user.id,
              merchant_user_id: merchantOwner.user_id,
            })
            .select("id")
            .single()
          newRoom = fallbackRoom.data
          createRoomError = fallbackRoom.error
        }

        if (createRoomError || !newRoom?.id) {
          return NextResponse.json(
            { error: createRoomError?.message || "Ruang chat tidak dapat dibuat." },
            { status: 500 },
          )
        }

        roomId = newRoom.id
      }
    } else {
      return NextResponse.json({ error: "Ruang chat tidak ditemukan." }, { status: 400 })
    }
  }

  const { data: room, error: roomError } = await adminSupabase
    .from("package_chat_rooms")
    .select("id, customer_id, merchant_user_id")
    .eq("id", roomId)
    .single()

  if (roomError || !room) {
    return NextResponse.json({ error: "Ruang chat tidak valid." }, { status: 400 })
  }

  if (room.customer_id !== user.id && room.merchant_user_id !== user.id) {
    return NextResponse.json({ error: "Anda tidak punya akses ke ruang chat ini." }, { status: 403 })
  }

  const uploadedAttachment = await uploadChatAttachment({
    roomId: room.id,
    senderId: user.id,
    file: attachment,
  })

  if (uploadedAttachment.error) {
    return NextResponse.json({ error: uploadedAttachment.error }, { status: 400 })
  }

  const { data: insertedMessage, error: insertError } = await adminSupabase
    .from("package_chat_messages")
    .insert({
      room_id: room.id,
      sender_id: user.id,
      message: message || "",
      attachment_url: uploadedAttachment.attachment?.url || null,
      attachment_name: uploadedAttachment.attachment?.name || null,
      attachment_mime_type: uploadedAttachment.attachment?.mimeType || null,
    })
    .select("id, room_id, sender_id, message, attachment_url, attachment_name, attachment_mime_type, created_at")
    .single()

  if (insertError || !insertedMessage) {
    return NextResponse.json(
      { error: insertError?.message || "Gagal kirim pesan." },
      { status: 500 },
    )
  }

  const nowIso = new Date().toISOString()
  const roomUpdate =
    room.merchant_user_id === user.id
      ? {
          updated_at: nowIso,
          last_message_at: nowIso,
          last_message_sender_id: user.id,
          merchant_last_read_at: nowIso,
          merchant_hidden_at: null,
          customer_hidden_at: null,
        }
      : {
          updated_at: nowIso,
          last_message_at: nowIso,
          last_message_sender_id: user.id,
          customer_last_read_at: nowIso,
          customer_hidden_at: null,
          merchant_hidden_at: null,
        }

  const { error: updateRoomError } = await adminSupabase
    .from("package_chat_rooms")
    .update(roomUpdate)
    .eq("id", room.id)

  if (updateRoomError && updateRoomError.message.includes("last_message")) {
    await adminSupabase
      .from("package_chat_rooms")
      .update({ updated_at: nowIso })
      .eq("id", room.id)
  }

  return NextResponse.json({
    roomId: room.id,
    message: insertedMessage,
  })
}
