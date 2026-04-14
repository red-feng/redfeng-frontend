import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  canInternalUsersDirectMessageLocked,
  getInternalProfileById,
  markInternalRoomRead,
} from "@/lib/internal-chat"
import { uploadInternalChatAttachment } from "@/lib/internal-chat-attachments"
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

  const profile = await getInternalProfileById(adminSupabase, user.id)
  if (!profile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const formData = await request.formData()
  const roomId = String(formData.get("room_id") || "").trim()
  const message = String(formData.get("message") || "").trim()
  const attachmentFile = formData.get("attachment")
  const attachment = attachmentFile instanceof File ? attachmentFile : null

  if (!roomId) {
    return NextResponse.json({ error: "Ruang chat tidak valid." }, { status: 400 })
  }
  if (!message && (!attachment || attachment.size <= 0)) {
    return NextResponse.json({ error: "Pesan atau lampiran wajib diisi." }, { status: 400 })
  }

  const { data: memberRow, error: memberError } = await adminSupabase
    .from("internal_chat_room_members")
    .select("room_id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (memberError) {
    return NextResponse.json({ error: memberError.message || "Gagal verifikasi room." }, { status: 500 })
  }
  if (!memberRow) {
    return NextResponse.json({ error: "Anda tidak punya akses ke room ini." }, { status: 403 })
  }

  const { data: roomMembers, error: roomMembersError } = await adminSupabase
    .from("internal_chat_room_members")
    .select("user_id")
    .eq("room_id", roomId)

  if (roomMembersError) {
    return NextResponse.json({ error: roomMembersError.message || "Gagal memuat member room." }, { status: 500 })
  }

  const otherMember = ((roomMembers as { user_id: string }[] | null) || []).find((row) => row.user_id !== user.id)
  if (!otherMember?.user_id) {
    return NextResponse.json({ error: "Room pribadi tidak valid." }, { status: 400 })
  }

  const targetProfile = await getInternalProfileById(adminSupabase, otherMember.user_id)
  if (!targetProfile || !canInternalUsersDirectMessageLocked(profile.role, targetProfile.role)) {
    return NextResponse.json({ error: "Role ini tidak diizinkan untuk chat langsung." }, { status: 403 })
  }

  const uploadedAttachment = await uploadInternalChatAttachment({
    roomId,
    senderId: user.id,
    file: attachment,
  })
  if (uploadedAttachment.error) {
    return NextResponse.json({ error: uploadedAttachment.error }, { status: 400 })
  }

  const { data: insertedMessage, error: insertError } = await adminSupabase
    .from("internal_chat_messages")
    .insert({
      room_id: roomId,
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
      { error: insertError?.message || "Gagal kirim pesan internal." },
      { status: 500 },
    )
  }

  const nowIso = new Date().toISOString()
  const { error: roomUpdateError } = await adminSupabase
    .from("internal_chat_rooms")
    .update({
      updated_at: nowIso,
      last_message_at: nowIso,
      last_message_sender_id: user.id,
    })
    .eq("id", roomId)

  if (roomUpdateError) {
    return NextResponse.json({ error: roomUpdateError.message || "Gagal update room chat." }, { status: 500 })
  }

  try {
    await markInternalRoomRead(adminSupabase, roomId, user.id, nowIso)
  } catch {}

  return NextResponse.json({ roomId, message: insertedMessage })
}
