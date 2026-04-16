import { NextResponse } from "next/server"
import { getMerchantSupportContextForUser } from "@/lib/merchant-support"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const merchant = await getMerchantSupportContextForUser(adminSupabase, user.id)
    const roomResult = await adminSupabase
      .from("merchant_support_rooms")
      .select("last_message_at, last_message_sender_role, merchant_last_read_at")
      .eq("merchant_id", merchant.merchantId)
      .maybeSingle()

    if (roomResult.error) {
      return NextResponse.json({ error: roomResult.error.message || "Gagal membaca unread merchant support." }, { status: 500 })
    }

    const room = roomResult.data as {
      last_message_at: string | null
      last_message_sender_role: "merchant" | "admin" | "system" | null
      merchant_last_read_at: string | null
    } | null

    const unreadCount =
      room?.last_message_sender_role === "admin" &&
      room.last_message_at &&
      (!room.merchant_last_read_at || room.last_message_at > room.merchant_last_read_at)
        ? 1
        : 0

    return NextResponse.json({ unreadCount })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membaca unread merchant support."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
