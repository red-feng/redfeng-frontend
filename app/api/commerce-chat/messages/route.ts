import { NextResponse } from "next/server"
import {
  COMMERCE_CHAT_PAGE_SIZE,
  COMMERCE_CHAT_NO_STORE_HEADERS,
  getCommerceChatProfile,
  isBlockedCommerceProfileRole,
  loadCommerceChatMessagesPageForUser,
  markCommerceThreadRead,
} from "@/lib/commerce-chat"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: COMMERCE_CHAT_NO_STORE_HEADERS })
  }

  const profile = await getCommerceChatProfile(adminSupabase, user.id)
  if (isBlockedCommerceProfileRole(profile?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: COMMERCE_CHAT_NO_STORE_HEADERS })
  }

  const { searchParams } = new URL(request.url)
  const threadId = String(searchParams.get("threadId") || "").trim()
  const beforeCreatedAt = String(searchParams.get("beforeCreatedAt") || "").trim()
  const requestedLimit = Number(searchParams.get("limit") || COMMERCE_CHAT_PAGE_SIZE)
  const shouldMarkRead = searchParams.get("markRead") !== "0"

  if (!threadId) {
    return NextResponse.json({ error: "Missing threadId" }, { status: 400, headers: COMMERCE_CHAT_NO_STORE_HEADERS })
  }

  try {
    if (shouldMarkRead) {
      await markCommerceThreadRead(adminSupabase, threadId, user.id)
    }
    const page = await loadCommerceChatMessagesPageForUser(adminSupabase, threadId, user.id, {
      beforeCreatedAt: beforeCreatedAt || null,
      limit: requestedLimit,
    })
    return NextResponse.json(page, { headers: COMMERCE_CHAT_NO_STORE_HEADERS })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat pesan commerce."
    const status = message.includes("akses") ? 403 : 500
    return NextResponse.json({ error: message }, { status, headers: COMMERCE_CHAT_NO_STORE_HEADERS })
  }
}
