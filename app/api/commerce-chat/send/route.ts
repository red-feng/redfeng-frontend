import { NextResponse } from "next/server"
import {
  getCommerceChatProfile,
  isBlockedCommerceProfileRole,
  sendCommerceChatMessage,
} from "@/lib/commerce-chat"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
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

  const formData = await request.formData()
  const threadId = String(formData.get("thread_id") || "").trim()
  const message = String(formData.get("message") || "").trim()
  const clientMessageId = String(formData.get("client_message_id") || "").trim()
  const attachmentFile = formData.get("attachment")
  const attachment = attachmentFile instanceof File ? attachmentFile : null

  if (!threadId) {
    return NextResponse.json({ error: "Thread commerce tidak valid." }, { status: 400 })
  }

  try {
    const result = await sendCommerceChatMessage(adminSupabase, {
      threadId,
      userId: user.id,
      message,
      clientMessageId: clientMessageId || null,
      attachment,
    })

    return NextResponse.json({
      actorRole: result.actorRole,
      message: result.message,
      deduplicated: result.deduplicated,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengirim pesan commerce."
    const lowered = message.toLowerCase()
    const status =
      lowered.includes("wajib diisi") || lowered.includes("tidak valid") || lowered.includes("dibekukan")
        ? 400
        : lowered.includes("akses")
          ? 403
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
