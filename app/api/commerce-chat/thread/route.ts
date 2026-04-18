import { NextResponse } from "next/server"
import {
  COMMERCE_CHAT_NO_STORE_HEADERS,
  ensureCommerceInquiryThread,
  getCommerceChatProfile,
  getCommerceChatThreadMetaForUser,
  isBlockedCommerceProfileRole,
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
  if (!threadId) {
    return NextResponse.json({ error: "Missing threadId" }, { status: 400, headers: COMMERCE_CHAT_NO_STORE_HEADERS })
  }

  try {
    const thread = await getCommerceChatThreadMetaForUser(adminSupabase, threadId, user.id)
    if (!thread) {
      return NextResponse.json({ error: "Thread commerce tidak ditemukan." }, { status: 404, headers: COMMERCE_CHAT_NO_STORE_HEADERS })
    }

    return NextResponse.json({ thread }, { headers: COMMERCE_CHAT_NO_STORE_HEADERS })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat thread commerce."
    const status = message.includes("akses") ? 403 : 500
    return NextResponse.json({ error: message }, { status, headers: COMMERCE_CHAT_NO_STORE_HEADERS })
  }
}

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => null)) as {
    packageId?: string
    sourceContext?: "public_package" | "checkout" | "booking" | "reorder"
  } | null

  const packageId = String(body?.packageId || "").trim()
  if (!packageId) {
    return NextResponse.json({ error: "Package chat inquiry tidak valid." }, { status: 400, headers: COMMERCE_CHAT_NO_STORE_HEADERS })
  }

  try {
    const result = await ensureCommerceInquiryThread(adminSupabase, {
      customerUserId: user.id,
      packageId,
      sourceContext: body?.sourceContext || "public_package",
    })
    const thread = await getCommerceChatThreadMetaForUser(adminSupabase, result.threadId, user.id)
    return NextResponse.json({
      thread,
      created: result.created,
    }, { headers: COMMERCE_CHAT_NO_STORE_HEADERS })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyiapkan thread commerce."
    const status =
      message.includes("tidak valid") || message.includes("Gunakan portal merchant")
        ? 400
        : message.includes("baru saja dihapus")
          ? 409
        : 500
    return NextResponse.json({ error: message }, { status, headers: COMMERCE_CHAT_NO_STORE_HEADERS })
  }
}
