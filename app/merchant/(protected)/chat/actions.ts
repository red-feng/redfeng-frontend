"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type Locale, normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { redirect } from "next/navigation"

async function getChatActionText(locale?: Locale) {
  const resolved = locale || normalizeLocale(await getCurrentLocale())
  const dict = {
    id: {
      roomNotFound: "Ruang chat tidak ditemukan.",
      messageEmpty: "Pesan tidak boleh kosong.",
      roomInvalid: "Ruang chat tidak valid.",
      tableMissing: "Tabel chat belum tersedia. Jalankan migration chat terlebih dulu.",
      sendFailed: "Gagal kirim pesan",
    },
    en: {
      roomNotFound: "Chat room was not found.",
      messageEmpty: "Message cannot be empty.",
      roomInvalid: "Invalid chat room.",
      tableMissing: "Chat tables are not available yet. Run the chat migration first.",
      sendFailed: "Failed to send message",
    },
    zh: {
      roomNotFound: "未找到聊天房间。",
      messageEmpty: "消息内容不能为空。",
      roomInvalid: "聊天房间无效。",
      tableMissing: "聊天数据表尚未可用。请先运行聊天迁移。",
      sendFailed: "发送消息失败",
    },  } satisfies Record<Locale, Record<string, string>>

  return dict[resolved]
}

export async function sendMerchantChatMessage(formData: FormData) {
  const t = await getChatActionText()
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const roomId = String(formData.get("room_id") || "")
  const tab = String(formData.get("tab") || "pre")
  const message = String(formData.get("message") || "").trim()

  if (!roomId) {
    redirect(`/merchant/chat?tab=${tab}&error=${encodeURIComponent(t.roomNotFound)}`)
  }

  if (!message) {
    redirect(`/merchant/chat?tab=${tab}&room_id=${roomId}&error=${encodeURIComponent(t.messageEmpty)}`)
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
    redirect(`/merchant/chat?tab=${tab}&error=${encodeURIComponent(t.roomInvalid)}`)
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
      ? t.tableMissing
      : `${t.sendFailed}: ${insertError.message}`
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

