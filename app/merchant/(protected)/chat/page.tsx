import CommerceChatRealtimeClient from "@/app/commerce-chat/CommerceChatRealtimeClient"
import {
  COMMERCE_CHAT_PAGE_SIZE,
  getCommerceChatProfile,
  loadCommerceChatMessagesPageForUser,
  loadCommerceChatThreadsForUser,
  resolveCommerceActiveThreadId,
} from "@/lib/commerce-chat"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

type Props = {
  searchParams: Promise<{ room_id?: string }>
}

export default async function MerchantChatPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/merchant/login")
  }

  const profile = await getCommerceChatProfile(adminSupabase, user.id)
  if (profile?.role !== "merchant") {
    redirect("/merchant/dashboard")
  }

  const threads = await loadCommerceChatThreadsForUser(adminSupabase, user.id)
  const requestedThreadId = String(params.room_id || "").trim()
  const activeThreadId = resolveCommerceActiveThreadId(requestedThreadId, threads)
  const initialPage = activeThreadId
    ? await loadCommerceChatMessagesPageForUser(adminSupabase, activeThreadId, user.id, {
        limit: COMMERCE_CHAT_PAGE_SIZE,
      })
    : { messages: [], hasMore: false, oldestCreatedAt: null as string | null }

  return (
    <main className="px-4 py-5 sm:px-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-[1480px]">
        <CommerceChatRealtimeClient
          userId={user.id}
          portal="merchant"
          initialThreads={threads}
          initialMessages={initialPage.messages}
          initialHasMore={initialPage.hasMore}
          initialOldestCreatedAt={initialPage.oldestCreatedAt}
          initialActiveThreadId={activeThreadId}
          headline={{
            badge: "Merchant Commerce Inbox",
            title: "Balas inquiry customer dari inbox commerce yang terpisah dan aman.",
            description:
              "Inbox ini hanya untuk percakapan customer-merchant. Jalur ini terpisah dari merchant support dan chat internal agar boundary operasional tetap bersih.",
          }}
        />
      </div>
    </main>
  )
}
