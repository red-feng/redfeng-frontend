import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
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

  const body = (await request.json().catch(() => null)) as { roomId?: string } | null
  const roomId = String(body?.roomId || "").trim()

  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 })
  }

  const { data: room, error } = await adminSupabase
    .from("package_chat_rooms")
    .select("id, customer_id, merchant_user_id")
    .eq("id", roomId)
    .single()

  if (error || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  let patch: Record<string, string> | null = null

  if (room.customer_id === user.id) {
    patch = { customer_hidden_at: new Date().toISOString() }
  } else if (room.merchant_user_id === user.id) {
    patch = { merchant_hidden_at: new Date().toISOString() }
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
