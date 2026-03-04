"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

export async function sendChatMessage(formData: FormData) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const roomId = String(formData.get("room_id") || "")
  const message = String(formData.get("message") || "").trim()

  if (!roomId) {
    redirect("/chat?error=Ruang chat tidak ditemukan.")
  }

  if (!message) {
    redirect(`/chat?room_id=${roomId}&error=Pesan tidak boleh kosong.`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: room, error: roomError } = await adminSupabase
    .from("package_chat_rooms")
    .select("id, customer_id, merchant_user_id, package_id")
    .eq("id", roomId)
    .single()

  if (roomError || !room) {
    redirect(`/chat?error=Ruang chat tidak valid.`)
  }

  const isParticipant = room.customer_id === user.id || room.merchant_user_id === user.id
  if (!isParticipant) {
    redirect(`/chat?error=Anda tidak punya akses ke ruang chat ini.`)
  }

  const { error: insertError } = await adminSupabase
    .from("package_chat_messages")
    .insert({
      room_id: room.id,
      sender_id: user.id,
      message,
    })

  if (insertError) {
    const messageText =
      insertError.message.includes("does not exist")
        ? "Tabel chat belum tersedia. Jalankan migration chat terlebih dulu."
        : `Gagal kirim pesan: ${insertError.message}`
    redirect(`/chat?room_id=${room.id}&error=${encodeURIComponent(messageText)}`)
  }

  await adminSupabase
    .from("package_chat_rooms")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", room.id)

  redirect(`/chat?room_id=${room.id}`)
}
