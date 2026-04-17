import { NextResponse } from "next/server"
import {
  getCommerceChatProfile,
  getCommerceChatUnreadBadgeCount,
  isBlockedCommerceProfileRole,
} from "@/lib/commerce-chat"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ unreadCount: 0 })
  }

  const profile = await getCommerceChatProfile(adminSupabase, user.id)
  if (isBlockedCommerceProfileRole(profile?.role)) {
    return NextResponse.json({ unreadCount: 0 })
  }

  try {
    const unreadCount = await getCommerceChatUnreadBadgeCount(adminSupabase, user.id)
    return NextResponse.json({ unreadCount })
  } catch {
    return NextResponse.json({ unreadCount: 0 })
  }
}
