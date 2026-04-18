import { NextResponse } from "next/server"
import {
  getCommerceChatProfile,
  hardDeleteCommerceThreadForUser,
  isBlockedCommerceProfileRole,
} from "@/lib/commerce-chat"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await getCommerceChatProfile(adminSupabase, user.id)
  if (isBlockedCommerceProfileRole(profile?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as { threadId?: string } | null
  const threadId = String(body?.threadId || "").trim()

  if (!threadId) {
    return NextResponse.json({ error: "Thread commerce tidak valid." }, { status: 400 })
  }

  try {
    const result = await hardDeleteCommerceThreadForUser(adminSupabase, threadId, user.id)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus thread commerce."
    const lowered = message.toLowerCase()
    const status = lowered.includes("akses") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
