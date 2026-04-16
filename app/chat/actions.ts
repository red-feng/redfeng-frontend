"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { uploadChatAttachment } from "@/lib/chat/attachments"
import {
  ChatRoomFlowError,
  ensureCustomerBookingChatRoom,
  ensureCustomerPackageChatRoom,
} from "@/lib/chat/customer-room"
import { redirect } from "next/navigation"

export async function sendChatMessage(formData: FormData) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  let roomId = String(formData.get("room_id") || "")
  const packageId = String(formData.get("package_id") || "")
  const bookingId = String(formData.get("booking_id") || "")
  const message = String(formData.get("message") || "").trim()
  const portal = "customer"
  const attachmentFile = formData.get("attachment")
  const attachment = attachmentFile instanceof File ? attachmentFile : null

  const buildCustomerChatTarget = (params: {
    roomId?: string
    bookingId?: string
    packageId?: string
    error?: string
  }) => {
    const search = new URLSearchParams()
    if (params.roomId) search.set("room_id", params.roomId)
    if (params.bookingId) search.set("booking_id", params.bookingId)
    if (params.packageId) search.set("package_id", params.packageId)
    search.set("portal", portal)
    if (params.error) search.set("error", params.error)
    return `/chat?${search.toString()}`
  }

  if (!message && (!attachment || attachment.size <= 0)) {
    const target = buildCustomerChatTarget({
      roomId: roomId || undefined,
      bookingId: bookingId || undefined,
      packageId: packageId || undefined,
      error: "Pesan atau lampiran wajib diisi.",
    })
    redirect(target)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  if (!roomId) {
    if (bookingId) {
      try {
        const targetRoom = await ensureCustomerBookingChatRoom(adminSupabase, {
          bookingId,
          customerId: user.id,
          customerEmail: user.email,
          senderId: user.id,
          markCustomerRead: true,
        })
        roomId = targetRoom.roomId
      } catch (error) {
        const message =
          error instanceof ChatRoomFlowError && error.code === "migration_missing"
            ? "Chat sesudah booking butuh migration terbaru."
            : error instanceof Error
              ? error.message
              : "Ruang chat booking tidak dapat dipakai."
        redirect(
          buildCustomerChatTarget({
            bookingId,
            error: message,
          }),
        )
      }
    } else if (packageId) {
      try {
        const targetRoom = await ensureCustomerPackageChatRoom(adminSupabase, {
          packageId,
          customerId: user.id,
          senderId: user.id,
          markCustomerRead: true,
        })
        roomId = targetRoom.roomId
      } catch (error) {
        const message = error instanceof Error ? error.message : "Ruang chat tidak dapat dibuat."
        redirect(
          buildCustomerChatTarget({
            packageId,
            error: message,
          }),
        )
      }
    } else {
      redirect(buildCustomerChatTarget({ error: "Ruang chat tidak ditemukan." }))
    }
  }

  const resolveRoomById = async (id: string) =>
    adminSupabase
      .from("package_chat_rooms")
      .select("id, customer_id, merchant_user_id, package_id")
      .eq("id", id)
      .single()

  let { data: room, error: roomError } = await resolveRoomById(roomId)

  if (roomError || !room) {
    if (bookingId) {
      try {
        const targetRoom = await ensureCustomerBookingChatRoom(adminSupabase, {
          bookingId,
          customerId: user.id,
          customerEmail: user.email,
          senderId: user.id,
          markCustomerRead: true,
        })
        roomId = targetRoom.roomId
      } catch {
        // keep fallback to invalid room error below
      }
    } else if (packageId) {
      try {
        const targetRoom = await ensureCustomerPackageChatRoom(adminSupabase, {
          packageId,
          customerId: user.id,
          senderId: user.id,
          markCustomerRead: true,
        })
        roomId = targetRoom.roomId
      } catch {
        // keep fallback to invalid room error below
      }
    }

    if (roomId) {
      const fallbackLookup = await resolveRoomById(roomId)
      room = fallbackLookup.data
      roomError = fallbackLookup.error
    }
  }

  if (roomError || !room) {
    redirect(buildCustomerChatTarget({ error: "Ruang chat tidak valid." }))
  }

  const isParticipant = room.customer_id === user.id || room.merchant_user_id === user.id
  if (!isParticipant) {
    redirect(buildCustomerChatTarget({ error: "Anda tidak punya akses ke ruang chat ini." }))
  }

  const uploadedAttachment = await uploadChatAttachment({
    roomId: room.id,
    senderId: user.id,
    file: attachment,
  })

  if (uploadedAttachment.error) {
    redirect(
      buildCustomerChatTarget({
        roomId: room.id,
        error: uploadedAttachment.error,
      }),
    )
  }

  const { error: insertError } = await adminSupabase
    .from("package_chat_messages")
    .insert({
      room_id: room.id,
      sender_id: user.id,
      message: message || "",
      attachment_url: uploadedAttachment.attachment?.url || null,
      attachment_name: uploadedAttachment.attachment?.name || null,
      attachment_mime_type: uploadedAttachment.attachment?.mimeType || null,
    })

  if (insertError) {
    const messageText =
      insertError.message.includes("does not exist")
        ? "Tabel chat belum tersedia. Jalankan migration chat terlebih dulu."
        : `Gagal kirim pesan: ${insertError.message}`
    redirect(
      buildCustomerChatTarget({
        roomId: room.id,
        error: messageText,
      }),
    )
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

  redirect(
    buildCustomerChatTarget({
      roomId: room.id,
    }),
  )
}
