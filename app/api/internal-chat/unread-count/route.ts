import { NextResponse } from "next/server"
import { getInternalChatUnreadBadgeCount } from "@/lib/internal-chat/badge"
import { getInternalProfileById } from "@/lib/internal-chat/index"
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

  const profile = await getInternalProfileById(adminSupabase, user.id)
  if (!profile) {
    return NextResponse.json({ unreadCount: 0 })
  }

  const unreadCount = await getInternalChatUnreadBadgeCount(adminSupabase, user.id)
  return NextResponse.json({ unreadCount })
}
