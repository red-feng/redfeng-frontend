import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { uploadChatAttachment } from "@/lib/chat/attachments"
import { resolvePackageChatActorRole } from "@/lib/chat/package-chat-access"
import { buildReopenRoomPatch } from "@/lib/chat/room-visibility"
import {
  ChatRoomFlowError,
  ensureCustomerBookingChatRoom,
  ensureCustomerPackageChatRoom,
} from "@/lib/chat/customer-room"
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
        const status = error instanceof ChatRoomFlowError && error.code === "migration_missing" ? 500 : 400
        const message = error instanceof Error ? error.message : "Ruang chat booking tidak dapat dipakai."
        return NextResponse.json({ error: message }, { status })
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
        const status = error instanceof ChatRoomFlowError && error.code === "migration_missing" ? 500 : 400
        const message = error instanceof Error ? error.message : "Ruang chat tidak dapat dibuat."
        return NextResponse.json({ error: message }, { status })
      }
    } else {
      return NextResponse.json({ error: "Ruang chat tidak ditemukan." }, { status: 400 })
    }
  }

  const { data: room, error: roomError } = await adminSupabase
    .from("package_chat_rooms")
    .select("id, package_id, customer_id, merchant_user_id")
    .eq("id", roomId)
    .single()

  if (roomError || !room) {
    return NextResponse.json({ error: "Ruang chat tidak valid." }, { status: 400 })
  }

  const actorRole = await resolvePackageChatActorRole(adminSupabase, user.id, room)
  if (!actorRole) {
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
  const roomUpdate = buildReopenRoomPatch(actorRole, nowIso, user.id)

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
