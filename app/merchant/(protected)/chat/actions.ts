"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

export async function sendMerchantChatMessage(formData: FormData) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const roomId = String(formData.get("room_id") || "")
  const tab = String(formData.get("tab") || "pre")
  const message = String(formData.get("message") || "").trim()

  if (!roomId) {
    redirect(`/merchant/chat?tab=${tab}&error=Ruang chat tidak ditemukan.`)
  }

  if (!message) {
    redirect(`/merchant/chat?tab=${tab}&room_id=${roomId}&error=Pesan tidak boleh kosong.`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/merchant/login")
  }

  const { data: room, error: roomError } = await adminSupabase
    .from("package_chat_rooms")
    .select("id, merchant_user_id")
    .eq("id", roomId)
    .single()

  if (roomError || !room || room.merchant_user_id !== user.id) {
    redirect(`/merchant/chat?tab=${tab}&error=Ruang chat tidak valid.`)
  }

  const { error: insertError } = await adminSupabase
    .from("package_chat_messages")
    .insert({
      room_id: room.id,
      sender_id: user.id,
      message,
    })

  if (insertError) {
    const text = insertError.message.includes("does not exist")
      ? "Tabel chat belum tersedia. Jalankan migration chat terlebih dulu."
      : `Gagal kirim pesan: ${insertError.message}`
    redirect(`/merchant/chat?tab=${tab}&room_id=${room.id}&error=${encodeURIComponent(text)}`)
  }

  const roomUpdate = {
    updated_at: new Date().toISOString(),
    last_message_at: new Date().toISOString(),
    last_message_sender_id: user.id,
    merchant_last_read_at: new Date().toISOString(),
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

  redirect(`/merchant/chat?tab=${tab}&room_id=${room.id}`)
}
