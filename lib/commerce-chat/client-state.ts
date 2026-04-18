import type { CommerceChatThreadItem } from "@/lib/commerce-chat/core"

export function resolveCommerceActiveThreadId(
  requestedThreadId: string | null | undefined,
  threads: CommerceChatThreadItem[],
) {
  const normalizedRequestedThreadId = String(requestedThreadId || "").trim()
  if (normalizedRequestedThreadId && threads.some((thread) => thread.id === normalizedRequestedThreadId)) {
    return normalizedRequestedThreadId
  }

  return threads[0]?.id || ""
}

export function resolveCommerceActiveThreadIdAfterDelete(params: {
  currentActiveThreadId: string | null | undefined
  deletedThreadId: string
  remainingThreads: CommerceChatThreadItem[]
}) {
  const currentActiveThreadId = String(params.currentActiveThreadId || "").trim()
  if (currentActiveThreadId && currentActiveThreadId !== params.deletedThreadId) {
    return currentActiveThreadId
  }

  return params.remainingThreads[0]?.id || ""
}
