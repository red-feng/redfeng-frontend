import { NextResponse } from "next/server"
import {
  COMMERCE_CHAT_DELETE_ROUTE_ERRORS,
  getCommerceChatProfile,
  hardDeleteCommerceThreadForUser,
  isBlockedCommerceProfileRole,
  resolveCommerceChatDeleteErrorStatus,
} from "@/lib/commerce-chat"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(request: Request) {
  // LOCKED ENTRYPOINT:
  // Route ini harus tetap mendelegasikan otorisasi role delete ke core/policy commerce chat.
  // Jangan tambahkan role baru di sini tanpa mengubah kontrak yang sudah dikunci di test.
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: COMMERCE_CHAT_DELETE_ROUTE_ERRORS.unauthorized }, { status: 401 })
  }

  const profile = await getCommerceChatProfile(adminSupabase, user.id)
  if (isBlockedCommerceProfileRole(profile?.role)) {
    return NextResponse.json({ error: COMMERCE_CHAT_DELETE_ROUTE_ERRORS.forbidden }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as { threadId?: string } | null
  const threadId = String(body?.threadId || "").trim()

  if (!threadId) {
    return NextResponse.json({ error: COMMERCE_CHAT_DELETE_ROUTE_ERRORS.invalidThread }, { status: 400 })
  }

  try {
    const result = await hardDeleteCommerceThreadForUser(adminSupabase, threadId, user.id)
    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : COMMERCE_CHAT_DELETE_ROUTE_ERRORS.deleteFailed
    console.error("[commerce-chat] delete thread failed", {
      threadId,
      userId: user.id,
      error: message,
    })
    const status = resolveCommerceChatDeleteErrorStatus(message)
    return NextResponse.json({ error: message }, { status })
  }
}
