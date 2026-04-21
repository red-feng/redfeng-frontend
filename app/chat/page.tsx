import CommerceChatRealtimeClient from "@/app/commerce-chat/CommerceChatRealtimeClient"
import {
  COMMERCE_CHAT_PAGE_SIZE,
  ensureCommerceInquiryThread,
  getDeletedCommerceChatNoticeForUser,
  getCommerceChatProfile,
  isBlockedCommerceProfileRole,
  loadCommerceChatMessagesPageForUser,
  markCommerceThreadRead,
  loadCommerceChatThreadsForUser,
  resolveCommerceActiveThreadId,
} from "@/lib/commerce-chat"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object") return false
  const digest = "digest" in error ? String(error.digest || "") : ""
  return digest.startsWith("NEXT_REDIRECT")
}

type Props = {
  searchParams: Promise<{ room_id?: string; package_id?: string; error?: string }>
}

export default async function ChatPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient("customer")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const nextTarget = params.package_id ? `/chat?package_id=${encodeURIComponent(params.package_id)}` : "/chat"
    redirect(`/login?next=${encodeURIComponent(nextTarget)}`)
  }

  const profile = await getCommerceChatProfile(adminSupabase, user.id)
  if (isBlockedCommerceProfileRole(profile?.role)) {
    redirect("/customer")
  }

  const requestedPackageId = String(params.package_id || "").trim()
  const requestedThreadId = String(params.room_id || "").trim()
  const requestedErrorMessage = String(params.error || "").trim()
  if (requestedPackageId && !requestedThreadId) {
    try {
      const result = await ensureCommerceInquiryThread(adminSupabase, {
        customerUserId: user.id,
        packageId: requestedPackageId,
        sourceContext: "public_package",
      })
      redirect(`/chat?room_id=${encodeURIComponent(result.threadId)}`)
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error
      }
      const message = error instanceof Error ? error.message : "Gagal menyiapkan thread commerce."
      redirect(`/chat?error=${encodeURIComponent(message)}`)
    }
  }

  const threads = await loadCommerceChatThreadsForUser(adminSupabase, user.id)
  const shouldKeepThreadSelection =
    Boolean(requestedThreadId) || (!requestedErrorMessage && !requestedPackageId)
  const activeThreadId = shouldKeepThreadSelection
    ? resolveCommerceActiveThreadId(requestedThreadId, threads)
    : ""
  const deletedThreadNotice =
    requestedThreadId && !activeThreadId
      ? (await getDeletedCommerceChatNoticeForUser(adminSupabase, requestedThreadId, user.id)) || ""
      : ""
  const initialServerNotice = requestedErrorMessage || deletedThreadNotice
  const initialPage = activeThreadId
    ? await (async () => {
        await markCommerceThreadRead(adminSupabase, activeThreadId, user.id)
        return loadCommerceChatMessagesPageForUser(adminSupabase, activeThreadId, user.id, {
          limit: COMMERCE_CHAT_PAGE_SIZE,
        })
      })()
    : { messages: [], hasMore: false, oldestCreatedAt: null as string | null }

  return (
    <main className="px-4 py-5 sm:px-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <CommerceChatRealtimeClient
          userId={user.id}
          portal="customer"
          initialThreads={threads}
          initialMessages={initialPage.messages}
          initialHasMore={initialPage.hasMore}
          initialOldestCreatedAt={initialPage.oldestCreatedAt}
          initialActiveThreadId={activeThreadId}
          initialServerNotice={initialServerNotice}
          headline={{
            badge: "Customer Commerce Chat",
            title: "Lanjutkan percakapan aman dengan merchant dalam satu inbox.",
            description:
              "Gunakan chat ini untuk tanya paket, konfirmasi detail, dan melanjutkan komunikasi inquiry tanpa mencampur jalur support internal.",
          }}
        />
      </div>
    </main>
  )
}
