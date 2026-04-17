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
    .select("id, package_id, customer_id, merchant_user_id, source_room_id")
    .eq("id", roomId)
    .single()

  if (error || !room) {
    return NextResponse.json({ ok: true, roomId, deleted: true, alreadyDeleted: true })
  }

  const actorRole = await resolvePackageChatActorRole(adminSupabase, user.id, room)
  if (!actorRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const lineageAnchorIds = [...new Set([room.id, room.source_room_id].filter((value): value is string => Boolean(value)))]
  const { data: relatedRooms, error: relatedRoomsError } = await adminSupabase
    .from("package_chat_rooms")
    .select("id")
    .or(
      [
        lineageAnchorIds.length > 0 ? `id.in.(${lineageAnchorIds.join(",")})` : "",
        lineageAnchorIds.length > 0 ? `source_room_id.in.(${lineageAnchorIds.join(",")})` : "",
      ]
        .filter(Boolean)
        .join(","),
    )

  if (relatedRoomsError) {
    return NextResponse.json({ error: relatedRoomsError.message || "Failed to resolve related rooms" }, { status: 500 })
  }

  const roomIdsToDelete = [
    ...new Set((((relatedRooms as Array<{ id?: string }> | null) || []).map((item) => item.id).filter((value): value is string => Boolean(value)))),
  ]

  if (roomIdsToDelete.length === 0) {
    return NextResponse.json({ error: "Room target tidak ditemukan untuk dihapus." }, { status: 404 })
  }

  const { data: messageAttachments, error: attachmentsError } = await adminSupabase
    .from("package_chat_messages")
    .select("id, attachment_url")
    .in("room_id", roomIdsToDelete)

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

  const attachmentCleanupWarnings: string[] = []

  if (attachmentPaths.length > 0) {
    const bucket = getPackageChatAttachmentBucket()
    const chunkSize = 100

    for (let index = 0; index < attachmentPaths.length; index += chunkSize) {
      const chunk = attachmentPaths.slice(index, index + chunkSize)
      const { error: storageError } = await adminSupabase.storage.from(bucket).remove(chunk)
      if (storageError) {
        attachmentCleanupWarnings.push(storageError.message || "Failed to delete room attachments")
      }
    }
  }

  const { data: deletedRooms, error: deleteRoomError } = await adminSupabase
    .from("package_chat_rooms")
    .delete()
    .select("id")
    .in("id", roomIdsToDelete)

  if (deleteRoomError) {
    return NextResponse.json({ error: deleteRoomError.message || "Failed to delete room" }, { status: 500 })
  }

  const deletedRoomIds = (((deletedRooms as Array<{ id?: string }> | null) || []).map((item) => item.id).filter((value): value is string => Boolean(value)))
  if (deletedRoomIds.length === 0) {
    const { data: remainingRoom, error: remainingRoomError } = await adminSupabase
      .from("package_chat_rooms")
      .select("id")
      .in("id", roomIdsToDelete)

    if (remainingRoomError) {
      return NextResponse.json(
        { error: remainingRoomError.message || "Failed to verify room deletion" },
        { status: 500 },
      )
    }

    if (((remainingRoom as Array<{ id?: string }> | null) || []).length > 0) {
      return NextResponse.json(
        { error: "Masih ada room terkait yang tertinggal di database setelah proses hapus." },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { error: "Delete room tidak menghapus row mana pun." },
      { status: 409 },
    )
  }

  const { data: remainingRoomAfterDelete, error: verifyDeleteError } = await adminSupabase
    .from("package_chat_rooms")
    .select("id")
    .in("id", roomIdsToDelete)

  if (verifyDeleteError) {
    return NextResponse.json({ error: verifyDeleteError.message || "Failed to verify room deletion" }, { status: 500 })
  }

  if (((remainingRoomAfterDelete as Array<{ id?: string }> | null) || []).length > 0) {
    return NextResponse.json(
      { error: "Ada room terkait yang muncul lagi sesaat setelah dihapus." },
      { status: 409 },
    )
  }

  return NextResponse.json({
    ok: true,
    roomId,
    deletedRoomIds,
    deleted: true,
    warnings: attachmentCleanupWarnings.length > 0 ? attachmentCleanupWarnings : undefined,
  })
}
