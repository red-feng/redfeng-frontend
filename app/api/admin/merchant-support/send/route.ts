import { NextResponse } from "next/server"
import {
  getAdminMerchantSupportAccessProfile,
} from "@/lib/merchant-support/index"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient("admin")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { roomId?: string; message?: string } | null
  const roomId = String(body?.roomId || "").trim()
  const message = String(body?.message || "").trim()

  if (!roomId) {
    return NextResponse.json({ error: "Room merchant support tidak valid." }, { status: 400 })
  }

  if (!message) {
    return NextResponse.json({ error: "Pesan balasan tidak boleh kosong." }, { status: 400 })
  }

  try {
    const profile = await getAdminMerchantSupportAccessProfile(adminSupabase, user.id)
    if (!profile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const roomResult = await adminSupabase
      .from("merchant_support_rooms")
      .select("id, merchant_id, merchant_user_id")
      .eq("id", roomId)
      .maybeSingle()

    if (roomResult.error || !roomResult.data) {
      return NextResponse.json({ error: roomResult.error?.message || "Room merchant support tidak ditemukan." }, { status: 404 })
    }

    const nowIso = new Date().toISOString()
    const insertedResult = await adminSupabase
      .from("merchant_support_messages")
      .insert({
        room_id: roomId,
        sender_user_id: user.id,
        sender_role: "admin",
        message,
      })
      .select("id, room_id, sender_user_id, sender_role, message, created_at")
      .single()

    if (insertedResult.error || !insertedResult.data) {
      return NextResponse.json({ error: insertedResult.error?.message || "Gagal mengirim balasan admin." }, { status: 500 })
    }

    const roomUpdate = await adminSupabase
      .from("merchant_support_rooms")
      .update({
        updated_at: nowIso,
        last_message_at: nowIso,
        last_message_sender_role: "admin",
        admin_last_read_at: nowIso,
      })
      .eq("id", roomId)

    if (roomUpdate.error) {
      return NextResponse.json({ error: roomUpdate.error.message || "Gagal update room merchant support." }, { status: 500 })
    }

    return NextResponse.json({ message: insertedResult.data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengirim balasan admin."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
