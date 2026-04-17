import { NextResponse } from "next/server"
import {
  ensureMerchantSupportRoom,
  getMerchantSupportContextForUser,
  markMerchantSupportRoomReadByMerchant,
  notifyAdminAboutMerchantSupportMessage,
} from "@/lib/merchant-support/index"
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

  const body = (await request.json().catch(() => null)) as { message?: string } | null
  const message = String(body?.message || "").trim()

  if (!message) {
    return NextResponse.json({ error: "Pesan bantuan tidak boleh kosong." }, { status: 400 })
  }

  if (message.length > 4000) {
    return NextResponse.json({ error: "Pesan terlalu panjang. Maksimal 4000 karakter." }, { status: 400 })
  }

  try {
    const merchant = await getMerchantSupportContextForUser(adminSupabase, user.id)
    const room = await ensureMerchantSupportRoom(adminSupabase, merchant)
    const nowIso = new Date().toISOString()

    const insertedResult = await adminSupabase
      .from("merchant_support_messages")
      .insert({
        room_id: room.id,
        sender_user_id: user.id,
        sender_role: "merchant",
        message,
      })
      .select("id, room_id, sender_user_id, sender_role, message, created_at")
      .single()

    if (insertedResult.error || !insertedResult.data) {
      return NextResponse.json(
        { error: insertedResult.error?.message || "Gagal mengirim pesan bantuan." },
        { status: 500 },
      )
    }

    const roomUpdateResult = await adminSupabase
      .from("merchant_support_rooms")
      .update({
        updated_at: nowIso,
        last_message_at: nowIso,
        last_message_sender_role: "merchant",
        merchant_last_read_at: nowIso,
      })
      .eq("id", room.id)

    if (roomUpdateResult.error) {
      return NextResponse.json({ error: roomUpdateResult.error.message || "Gagal update room bantuan." }, { status: 500 })
    }

    await markMerchantSupportRoomReadByMerchant(adminSupabase, room.id, nowIso)

    try {
      await notifyAdminAboutMerchantSupportMessage({
        merchantLabel: merchant.merchantLabel,
        merchantCode: merchant.merchantCode,
        merchantEmail: merchant.merchantEmail,
        message,
      })
    } catch (error) {
      console.error("Failed to send merchant support notification email", error)
    }

    return NextResponse.json({
      room: {
        ...room,
        updated_at: nowIso,
        last_message_at: nowIso,
        last_message_sender_role: "merchant",
        merchant_last_read_at: nowIso,
      },
      message: insertedResult.data,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengirim pesan bantuan."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
