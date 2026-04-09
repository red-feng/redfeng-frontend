import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { buildHideRoomPatch } from "@/lib/chat/room-visibility"

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
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  let patch: Record<string, string> | null = null
  const nowIso = new Date().toISOString()

  if (room.customer_id === user.id) {
    patch = buildHideRoomPatch("customer", nowIso)
  } else if (room.merchant_user_id === user.id) {
    const { data: currentMerchantIds } = await adminSupabase
      .from("merchants")
      .select("id")
      .eq("user_id", user.id)

    const allowedMerchantIds = new Set((currentMerchantIds || []).map((item) => item.id))
    const { data: pkg } = await adminSupabase
      .from("packages")
      .select("merchant_id")
      .eq("id", room.package_id)
      .maybeSingle()

    if (pkg?.merchant_id && allowedMerchantIds.has(pkg.merchant_id)) {
      patch = buildHideRoomPatch("merchant", nowIso)
    }
  }

  if (!patch) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { error: updateError } = await adminSupabase
    .from("package_chat_rooms")
    .update(patch)
    .eq("id", roomId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message || "Failed to hide room" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, roomId })
}
