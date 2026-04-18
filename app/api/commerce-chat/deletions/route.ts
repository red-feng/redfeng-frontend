import { NextResponse } from "next/server"
import {
  COMMERCE_CHAT_NO_STORE_HEADERS,
  getCommerceChatProfile,
  isBlockedCommerceProfileRole,
  loadRecentCommerceThreadDeletionIdsForUser,
} from "@/lib/commerce-chat"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ threadIds: [] }, { headers: COMMERCE_CHAT_NO_STORE_HEADERS })
  }

  const profile = await getCommerceChatProfile(adminSupabase, user.id)
  if (isBlockedCommerceProfileRole(profile?.role)) {
    return NextResponse.json({ threadIds: [] }, { headers: COMMERCE_CHAT_NO_STORE_HEADERS })
  }

  try {
    const threadIds = await loadRecentCommerceThreadDeletionIdsForUser(adminSupabase, user.id)
    return NextResponse.json({ threadIds }, { headers: COMMERCE_CHAT_NO_STORE_HEADERS })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat marker penghapusan commerce chat."
    return NextResponse.json({ error: message }, { status: 500, headers: COMMERCE_CHAT_NO_STORE_HEADERS })
  }
}
