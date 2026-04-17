import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { extractPackageChatAttachmentPath, getPackageChatAttachmentBucket } from "@/lib/chat/attachment-path"
import { resolvePackageChatActorRole } from "@/lib/chat/package-chat-access"

export async function POST(request: Request) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { roomId?: string } | null
  const roomId = String(body?.roomId || "").trim()

  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 })
  }

  const { data: room, error } = await adminSupabase
    .from("package_chat_rooms")
    .select("id, package_id, customer_id, merchant_user_id")
    .eq("id", roomId)
    .single()

  if (error || !room) {
    return NextResponse.json({ ok: true, roomId, deleted: true, alreadyDeleted: true })
  }

  const actorRole = await resolvePackageChatActorRole(adminSupabase, user.id, room)
  if (!actorRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: messageAttachments, error: attachmentsError } = await adminSupabase
    .from("package_chat_messages")
    .select("id, attachment_url")
    .eq("room_id", roomId)

  if (attachmentsError) {
    return NextResponse.json({ error: attachmentsError.message || "Failed to read room attachments" }, { status: 500 })
  }

  const attachmentPaths = [
    ...new Set(
      ((messageAttachments as Array<{ attachment_url?: string | null }> | null) || [])
        .map((row) => extractPackageChatAttachmentPath(row.attachment_url))
        .filter((path): path is string => Boolean(path)),
    ),
  ]

  if (attachmentPaths.length > 0) {
    const bucket = getPackageChatAttachmentBucket()
    const chunkSize = 100

    for (let index = 0; index < attachmentPaths.length; index += chunkSize) {
      const chunk = attachmentPaths.slice(index, index + chunkSize)
      const { error: storageError } = await adminSupabase.storage.from(bucket).remove(chunk)
      if (storageError) {
        return NextResponse.json({ error: storageError.message || "Failed to delete room attachments" }, { status: 500 })
      }
    }
  }

  const { error: deleteMessagesError } = await adminSupabase
    .from("package_chat_messages")
    .delete()
    .eq("room_id", roomId)

  if (deleteMessagesError) {
    return NextResponse.json({ error: deleteMessagesError.message || "Failed to delete room messages" }, { status: 500 })
  }

  const { error: deleteRoomError } = await adminSupabase
    .from("package_chat_rooms")
    .delete()
    .eq("id", roomId)

  if (deleteRoomError) {
    return NextResponse.json({ error: deleteRoomError.message || "Failed to delete room" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, roomId, deleted: true })
}
