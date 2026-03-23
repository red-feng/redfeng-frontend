"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

export async function sendChatMessage(formData: FormData) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  let roomId = String(formData.get("room_id") || "")
  const packageId = String(formData.get("package_id") || "")
  const bookingId = String(formData.get("booking_id") || "")
  const message = String(formData.get("message") || "").trim()

  if (!message) {
    const target = roomId
      ? bookingId
        ? `/chat?booking_id=${bookingId}&room_id=${roomId}`
        : `/chat?room_id=${roomId}`
      : bookingId
        ? `/chat?booking_id=${bookingId}`
        : packageId
          ? `/chat?package_id=${packageId}`
          : "/chat"
    redirect(`${target}&error=Pesan tidak boleh kosong.`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  if (!roomId) {
    if (bookingId) {
      const { data: booking, error: bookingError } = await adminSupabase
        .from("bookings")
        .select("id, package_id, customer_email")
        .eq("id", bookingId)
        .single()

      if (bookingError || !booking?.package_id || !user.email || booking.customer_email !== user.email) {
        redirect(`/chat?booking_id=${bookingId}&error=Booking tidak valid untuk chat.`)
      }

      const { data: pkg, error: packageError } = await adminSupabase
        .from("packages")
        .select("id, merchant_id")
        .eq("id", booking.package_id)
        .single()

      if (packageError || !pkg?.merchant_id) {
        redirect(`/chat?booking_id=${bookingId}&error=Package tidak valid untuk chat.`)
      }

      const { data: merchantOwner, error: merchantError } = await adminSupabase
        .from("merchants")
        .select("user_id")
        .eq("id", pkg.merchant_id)
        .single()

      if (merchantError || !merchantOwner?.user_id) {
        redirect(`/chat?booking_id=${bookingId}&error=Merchant belum siap menerima chat.`)
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

        if (createRoomError && createRoomError.message.includes("booking_id")) {
          redirect(`/chat?booking_id=${bookingId}&error=Chat sesudah booking butuh migration terbaru.`)
        }

        if (createRoomError || !newRoom?.id) {
          const errorText = createRoomError?.message || "Ruang chat booking tidak dapat dibuat."
          redirect(`/chat?booking_id=${bookingId}&error=${encodeURIComponent(errorText)}`)
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
        redirect(`/chat?package_id=${packageId}&error=Package tidak valid untuk chat.`)
      }

      const { data: merchantOwner, error: merchantError } = await adminSupabase
        .from("merchants")
        .select("user_id")
        .eq("id", pkg.merchant_id)
        .single()

      if (merchantError || !merchantOwner?.user_id) {
        redirect(`/chat?package_id=${packageId}&error=Merchant belum siap menerima chat.`)
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
          const errorText = createRoomError?.message || "Ruang chat tidak dapat dibuat."
          redirect(`/chat?package_id=${packageId}&error=${encodeURIComponent(errorText)}`)
        }

        roomId = newRoom.id
      }
    } else {
      redirect("/chat?error=Ruang chat tidak ditemukan.")
    }
  }

  const { data: room, error: roomError } = await adminSupabase
    .from("package_chat_rooms")
    .select("id, customer_id, merchant_user_id, package_id")
    .eq("id", roomId)
    .single()

  if (roomError || !room) {
    redirect(`/chat?error=Ruang chat tidak valid.`)
  }

  const isParticipant = room.customer_id === user.id || room.merchant_user_id === user.id
  if (!isParticipant) {
    redirect(`/chat?error=Anda tidak punya akses ke ruang chat ini.`)
  }

  const { error: insertError } = await adminSupabase
    .from("package_chat_messages")
    .insert({
      room_id: room.id,
      sender_id: user.id,
      message,
    })

  if (insertError) {
    const messageText =
      insertError.message.includes("does not exist")
        ? "Tabel chat belum tersedia. Jalankan migration chat terlebih dulu."
        : `Gagal kirim pesan: ${insertError.message}`
    redirect(`/chat?room_id=${room.id}&error=${encodeURIComponent(messageText)}`)
  }

  const roomUpdate = {
    updated_at: new Date().toISOString(),
    last_message_at: new Date().toISOString(),
    last_message_sender_id: user.id,
    customer_last_read_at: new Date().toISOString(),
  }

  const { error: updateRoomError } = await adminSupabase
    .from("package_chat_rooms")
    .update(roomUpdate)
    .eq("id", room.id)

  if (updateRoomError && updateRoomError.message.includes("last_message")) {
    await adminSupabase
      .from("package_chat_rooms")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", room.id)
  }

  redirect(`/chat?room_id=${room.id}`)
}
