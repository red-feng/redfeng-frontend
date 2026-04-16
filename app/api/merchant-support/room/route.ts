import { NextResponse } from "next/server"
import {
  ensureMerchantSupportRoom,
  getMerchantSupportContextForUser,
  loadMerchantSupportMessages,
  markMerchantSupportRoomReadByMerchant,
} from "@/lib/merchant-support"
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
    const room = await ensureMerchantSupportRoom(adminSupabase, merchant)
    const readAtIso = new Date().toISOString()
    await markMerchantSupportRoomReadByMerchant(adminSupabase, room.id, readAtIso)
    const messages = await loadMerchantSupportMessages(adminSupabase, room.id)

    return NextResponse.json({
      room: {
        ...room,
        merchant_last_read_at: readAtIso,
      },
      merchant,
      messages,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat bantuan merchant."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
