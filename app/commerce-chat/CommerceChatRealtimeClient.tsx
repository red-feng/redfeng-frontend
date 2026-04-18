"use client"

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CHAT_DESIGN_LOCK } from "@/lib/chat-design-lock"
import { COMMERCE_CHAT_ENGINE } from "@/lib/chat-engines"
import {
  isCommerceChatImageAttachment,
  resolveCommerceActiveThreadId,
  resolveCommerceActiveThreadIdAfterDelete,
} from "@/lib/commerce-chat"
import { createClient } from "@/lib/supabase/client"
import type { CommerceChatMessageItem, CommerceChatThreadItem } from "@/lib/commerce-chat"

type RealtimeStatus = "connecting" | "live" | "fallback"

type ThreadListResponse = {
  threads?: CommerceChatThreadItem[]
  error?: string
}

type ThreadResponse = {
  thread?: CommerceChatThreadItem | null
  error?: string
}

type MessagePageResponse = {
  messages?: CommerceChatMessageItem[]
  hasMore?: boolean
  oldestCreatedAt?: string | null
  error?: string
}

type SendMessageResponse = {
  actorRole?: "customer" | "merchant"
  message?: CommerceChatMessageItem
  deduplicated?: boolean
  error?: string
}

type DeleteThreadResponse = {
  deletedThreadId?: string
  actorRole?: "customer" | "merchant"
  error?: string
}

type Props = {
  userId: string
  portal: "customer" | "merchant"
  initialThreads: CommerceChatThreadItem[]
  initialMessages: CommerceChatMessageItem[]
  initialHasMore: boolean
  initialOldestCreatedAt: string | null
  initialActiveThreadId: string
  headline: {
    badge: string
    title: string
    description: string
  }
}

type SendPhase = "idle" | "compressing" | "uploading"

const SNAPSHOT_FALLBACK_INTERVAL_MS = 12000
const SNAPSHOT_LIVE_EMPTY_INTERVAL_MS = 1500
const THREAD_LIST_SYNC_INTERVAL_MS = 1200

function sortThreads(threads: CommerceChatThreadItem[]) {
  return [...threads].sort((left, right) => {
    const leftDate = left.lastMessageAt || left.updatedAt || left.createdAt || ""
    const rightDate = right.lastMessageAt || right.updatedAt || right.createdAt || ""
    return rightDate.localeCompare(leftDate)
  })
}

function sortMessages(messages: CommerceChatMessageItem[]) {
  return [...messages].sort((left, right) => {
    const leftDate = left.created_at || ""
    const rightDate = right.created_at || ""
    if (leftDate === rightDate) return left.id.localeCompare(right.id)
    return leftDate.localeCompare(rightDate)
  })
}

function mergeMessages(existing: CommerceChatMessageItem[], incoming: CommerceChatMessageItem[]) {
  const merged = new Map<string, CommerceChatMessageItem>()
  for (const message of existing) merged.set(message.id, message)
  for (const message of incoming) merged.set(message.id, message)
  return sortMessages([...merged.values()])
}

function areThreadListsEqual(left: CommerceChatThreadItem[], right: CommerceChatThreadItem[]) {
  if (left.length !== right.length) return false
  return left.every((thread, index) => {
    const other = right[index]
    return (
      other &&
      thread.id === other.id &&
      thread.lastMessageAt === other.lastMessageAt &&
      thread.lastMessagePreview === other.lastMessagePreview &&
      thread.currentUserLastReadAt === other.currentUserLastReadAt
    )
  })
}

function areMessageListsEqual(left: CommerceChatMessageItem[], right: CommerceChatMessageItem[]) {
  if (left.length !== right.length) return false
  return left.every((message, index) => {
    const other = right[index]
    return (
      other &&
      message.id === other.id &&
      message.created_at === other.created_at &&
      message.body === other.body &&
      message.attachment_url === other.attachment_url
    )
  })
}

function isCommerceThreadAccessError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "")
  const lowered = message.toLowerCase()
  return lowered.includes("tidak punya akses") || lowered.includes("thread commerce tidak ditemukan")
}

function formatDateTime(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function buildClientMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function sanitizeUploadName(name: string, fallbackExtension: string) {
  const base = String(name || "attachment")
    .replace(/\.[^.]+$/, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(-80) || "attachment"

  return `${base}.${fallbackExtension}`
}

async function loadImageElement(file: File) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image()
      nextImage.onload = () => resolve(nextImage)
      nextImage.onerror = () => reject(new Error("Gagal membaca gambar lampiran."))
      nextImage.src = objectUrl
    })
    return image
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function optimizeAttachmentBeforeSend(file: File | null) {
  if (!file || file.size <= 0) return file

  const mimeType = String(file.type || "").toLowerCase()
  const shouldOptimizeImage =
    (mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/webp") &&
    file.size > 700 * 1024

  if (!shouldOptimizeImage) {
    return file
  }

  const image = await loadImageElement(file)
  const maxDimension = 1920
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
  const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale))
  const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement("canvas")
  canvas.width = targetWidth
  canvas.height = targetHeight
  const context = canvas.getContext("2d")
  if (!context) {
    return file
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight)

  const preferredMimeType = mimeType === "image/png" ? "image/webp" : mimeType
  const quality = preferredMimeType === "image/jpeg" || preferredMimeType === "image/webp" ? 0.82 : undefined

  const optimizedBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), preferredMimeType, quality)
  })

  if (!optimizedBlob) {
    return file
  }

  if (optimizedBlob.size >= file.size * 0.9) {
    return file
  }

  const extension = preferredMimeType === "image/webp" ? "webp" : preferredMimeType === "image/jpeg" ? "jpg" : "png"
  return new File([optimizedBlob], sanitizeUploadName(file.name, extension), {
    type: preferredMimeType,
    lastModified: Date.now(),
  })
}

export default function CommerceChatRealtimeClient({
  userId,
  portal,
  initialThreads,
  initialMessages,
  initialHasMore,
  initialOldestCreatedAt,
  initialActiveThreadId,
  headline,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabaseRef = useRef(createClient())
  const threadRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previousThreadRef = useRef("")
  const previousLastMessageIdRef = useRef("")
  const supabase = supabaseRef.current

  const [threads, setThreads] = useState<CommerceChatThreadItem[]>(() => sortThreads(initialThreads))
  const [activeThreadId, setActiveThreadId] = useState(initialActiveThreadId)
  const [messagesByThread, setMessagesByThread] = useState<Record<string, CommerceChatMessageItem[]>>(() =>
    initialActiveThreadId ? { [initialActiveThreadId]: initialMessages } : {},
  )
  const [loadedThreadIds, setLoadedThreadIds] = useState<Record<string, true>>(() =>
    initialActiveThreadId ? { [initialActiveThreadId]: true } : {},
  )
  const [hasMoreByThread, setHasMoreByThread] = useState<Record<string, boolean>>(() =>
    initialActiveThreadId ? { [initialActiveThreadId]: initialHasMore } : {},
  )
  const [oldestByThread, setOldestByThread] = useState<Record<string, string | null>>(() =>
    initialActiveThreadId ? { [initialActiveThreadId]: initialOldestCreatedAt } : {},
  )
  const [loadingOlderByThread, setLoadingOlderByThread] = useState<Record<string, boolean>>({})
  const [threadSearch, setThreadSearch] = useState("")
  const [draftMessage, setDraftMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sendPhase, setSendPhase] = useState<SendPhase>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting")
  const [deletingThreadId, setDeletingThreadId] = useState("")
  const threadsRef = useRef<CommerceChatThreadItem[]>(sortThreads(initialThreads))
  const activeThreadIdRef = useRef(initialActiveThreadId)
  const queuedSnapshotRefreshTimeoutRef = useRef<number | null>(null)
  const deletingThreadIdRef = useRef("")

  const activeThread = threads.find((thread) => thread.id === activeThreadId) || null
  const activeMessages = messagesByThread[activeThreadId] || []
  const activeMessagesLength = activeMessages.length
  const activeLastMessageId = activeMessages[activeMessagesLength - 1]?.id || ""
  const activeHasMore = Boolean(hasMoreByThread[activeThreadId])
  const activeLoadingOlder = Boolean(loadingOlderByThread[activeThreadId])
  const currentRoomId = searchParams.get("room_id") || ""

  const visibleThreads = useMemo(() => {
    const needle = threadSearch.trim().toLowerCase()
    if (!needle) return threads
    return threads.filter((thread) => {
      const haystack = `${thread.packageTitle || ""} ${thread.merchantLabel} ${thread.customerLabel} ${thread.lastMessagePreview || ""}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [threadSearch, threads])

  const unreadCount = useMemo(
    () =>
      threads.filter((thread) => {
        if (!thread.lastMessageAt || !thread.lastMessageSenderRole) return false
        if (thread.lastMessageSenderRole === "system") return false
        if (thread.lastMessageSenderRole === thread.currentUserActorRole) return false
        if (!thread.currentUserLastReadAt) return true
        return thread.lastMessageAt > thread.currentUserLastReadAt
      }).length,
    [threads],
  )

  const fetchThreads = useCallback(async () => {
    const response = await fetch(COMMERCE_CHAT_ENGINE.threadsEndpoint, { cache: "no-store" })
    const payload = (await response.json().catch(() => null)) as ThreadListResponse | null
    if (!response.ok) {
      throw new Error(payload?.error || "Gagal memuat daftar chat.")
    }
    return sortThreads(payload?.threads || [])
  }, [])

  const fetchThreadMeta = useCallback(async (threadId: string) => {
    const response = await fetch(`${COMMERCE_CHAT_ENGINE.threadEndpoint}?threadId=${encodeURIComponent(threadId)}`, { cache: "no-store" })
    const payload = (await response.json().catch(() => null)) as ThreadResponse | null
    if (!response.ok) return null
    return payload?.thread || null
  }, [])

  const fetchMessagesPage = useCallback(async (
    threadId: string,
    beforeCreatedAt?: string | null,
    options?: { markRead?: boolean },
  ) => {
    const search = new URLSearchParams({ threadId })
    if (beforeCreatedAt) search.set("beforeCreatedAt", beforeCreatedAt)
    if (options?.markRead === false) search.set("markRead", "0")
    const response = await fetch(`${COMMERCE_CHAT_ENGINE.messagesEndpoint}?${search.toString()}`, { cache: "no-store" })
    const payload = (await response.json().catch(() => null)) as MessagePageResponse | null
    if (!response.ok) {
      throw new Error(payload?.error || "Gagal memuat pesan chat.")
    }
    return payload || {}
  }, [])

  const refreshThreads = useCallback(async (keepCurrent = true) => {
    try {
      const nextThreads = await fetchThreads()
      if (!areThreadListsEqual(threadsRef.current, nextThreads)) {
        threadsRef.current = nextThreads
        setThreads(nextThreads)
      } else {
        threadsRef.current = nextThreads
      }
      const currentActiveThreadId = activeThreadIdRef.current
      const nextActiveThreadId = keepCurrent
        ? resolveCommerceActiveThreadId(currentActiveThreadId, nextThreads)
        : resolveCommerceActiveThreadId("", nextThreads)
      if (nextActiveThreadId !== currentActiveThreadId) {
        activeThreadIdRef.current = nextActiveThreadId
        setActiveThreadId(nextActiveThreadId)
      }
    } catch {}
  }, [fetchThreads])

  const refreshThreadListNow = useCallback(async (keepCurrent = true) => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return
    if (deletingThreadIdRef.current) return

    await refreshThreads(keepCurrent)
  }, [refreshThreads])

  const removeThreadLocally = useCallback((threadId: string) => {
    const nextThreads = threadsRef.current.filter((thread) => thread.id !== threadId)
    threadsRef.current = nextThreads
    setThreads(nextThreads)

    const nextActiveThreadId = resolveCommerceActiveThreadIdAfterDelete({
      currentActiveThreadId: activeThreadIdRef.current,
      deletedThreadId: threadId,
      remainingThreads: nextThreads,
    })

    if (nextActiveThreadId !== activeThreadIdRef.current) {
      activeThreadIdRef.current = nextActiveThreadId
      setActiveThreadId(nextActiveThreadId)
    }

    setMessagesByThread((current) => {
      const next = { ...current }
      delete next[threadId]
      return next
    })
    setLoadedThreadIds((current) => {
      const next = { ...current }
      delete next[threadId]
      return next
    })
    setHasMoreByThread((current) => {
      const next = { ...current }
      delete next[threadId]
      return next
    })
    setOldestByThread((current) => {
      const next = { ...current }
      delete next[threadId]
      return next
    })
    setLoadingOlderByThread((current) => {
      const next = { ...current }
      delete next[threadId]
      return next
    })
  }, [])

  const handleInaccessibleThread = useCallback((threadId: string) => {
    if (!threadId) return
    removeThreadLocally(threadId)
    setErrorMessage("")
    void refreshThreads()
  }, [refreshThreads, removeThreadLocally])

  const refreshLatestMessages = useCallback(async (threadId: string) => {
    if (!threadId) return
    try {
      const payload = await fetchMessagesPage(threadId)
      const nextMessages = sortMessages(payload.messages || [])
      setMessagesByThread((current) => ({ ...current, [threadId]: nextMessages }))
      setLoadedThreadIds((current) => ({ ...current, [threadId]: true }))
      setHasMoreByThread((current) => ({ ...current, [threadId]: Boolean(payload.hasMore) }))
      setOldestByThread((current) => ({
        ...current,
        [threadId]: payload.oldestCreatedAt || nextMessages[0]?.created_at || null,
      }))
    } catch (error) {
      if (isCommerceThreadAccessError(error)) {
        handleInaccessibleThread(threadId)
      }
    }
  }, [fetchMessagesPage, handleInaccessibleThread])

  const upsertThreadLocally = useCallback((thread: CommerceChatThreadItem) => {
    setThreads((current) => {
      const next = current.filter((item) => item.id !== thread.id)
      next.push(thread)
      const sorted = sortThreads(next)
      threadsRef.current = sorted
      return sorted
    })
  }, [])

  const refreshSnapshotNow = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return
    if (deletingThreadIdRef.current) return

    try {
      const nextThreads = await fetchThreads()
      if (!areThreadListsEqual(threadsRef.current, nextThreads)) {
        threadsRef.current = nextThreads
        setThreads(nextThreads)
      } else {
        threadsRef.current = nextThreads
      }

      const candidateThreadId = resolveCommerceActiveThreadId(activeThreadIdRef.current, nextThreads)
      if (candidateThreadId !== activeThreadIdRef.current) {
        activeThreadIdRef.current = candidateThreadId
        setActiveThreadId(candidateThreadId)
      }

      if (!candidateThreadId) return

      const payload = await fetchMessagesPage(candidateThreadId, null, { markRead: false })
      const nextMessages = sortMessages(payload.messages || [])
      setMessagesByThread((current) => {
        const mergedMessages = mergeMessages(current[candidateThreadId] || [], nextMessages)
        if (areMessageListsEqual(current[candidateThreadId] || [], mergedMessages)) {
          return current
        }
        return {
          ...current,
          [candidateThreadId]: mergedMessages,
        }
      })
      setLoadedThreadIds((current) => ({ ...current, [candidateThreadId]: true }))
      setHasMoreByThread((current) => ({ ...current, [candidateThreadId]: Boolean(payload.hasMore) }))
      setOldestByThread((current) => ({
        ...current,
        [candidateThreadId]: payload.oldestCreatedAt || nextMessages[0]?.created_at || null,
      }))
    } catch (error) {
      if (isCommerceThreadAccessError(error)) {
        handleInaccessibleThread(activeThreadIdRef.current)
      }
    }
  }, [fetchMessagesPage, fetchThreads, handleInaccessibleThread])

  const scheduleSnapshotRefresh = useCallback((delayMs = 180) => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return
    if (deletingThreadIdRef.current) return
    if (queuedSnapshotRefreshTimeoutRef.current) {
      window.clearTimeout(queuedSnapshotRefreshTimeoutRef.current)
    }

    queuedSnapshotRefreshTimeoutRef.current = window.setTimeout(() => {
      queuedSnapshotRefreshTimeoutRef.current = null
      void refreshSnapshotNow()
    }, delayMs)
  }, [refreshSnapshotNow])

  const loadOlderMessages = useCallback(async (threadId: string) => {
    if (!threadId || loadingOlderByThread[threadId] || !hasMoreByThread[threadId]) return
    const beforeCreatedAt = oldestByThread[threadId]
    if (!beforeCreatedAt) return

    const container = threadRef.current
    const previousHeight = container?.scrollHeight || 0
    const previousTop = container?.scrollTop || 0

    setLoadingOlderByThread((current) => ({ ...current, [threadId]: true }))
    try {
      const payload = await fetchMessagesPage(threadId, beforeCreatedAt)
      const olderMessages = sortMessages(payload.messages || [])
      if (olderMessages.length > 0) {
        setMessagesByThread((current) => {
          const existing = current[threadId] || []
          return {
            ...current,
            [threadId]: mergeMessages(olderMessages, existing),
          }
        })

        requestAnimationFrame(() => {
          const nextContainer = threadRef.current
          if (!nextContainer) return
          const nextHeight = nextContainer.scrollHeight
          nextContainer.scrollTop = Math.max(0, nextHeight - previousHeight + previousTop)
        })
      }

      setHasMoreByThread((current) => ({ ...current, [threadId]: Boolean(payload.hasMore) }))
      setOldestByThread((current) => ({
        ...current,
        [threadId]: payload.oldestCreatedAt || olderMessages[0]?.created_at || current[threadId] || null,
      }))
    } catch {
      setHasMoreByThread((current) => ({ ...current, [threadId]: false }))
    } finally {
      setLoadingOlderByThread((current) => ({ ...current, [threadId]: false }))
    }
  }, [fetchMessagesPage, hasMoreByThread, loadingOlderByThread, oldestByThread])

  useEffect(() => {
    threadsRef.current = threads
  }, [threads])

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId
  }, [activeThreadId])

  useEffect(() => {
    if (!activeThreadId) return
    if (!loadedThreadIds[activeThreadId]) {
      void refreshLatestMessages(activeThreadId)
    }
  }, [activeThreadId, loadedThreadIds, refreshLatestMessages])

  useEffect(() => {
    const normalizedCurrentRoomId = String(currentRoomId).trim()
    if (normalizedCurrentRoomId === activeThreadId) return

    const next = activeThreadId ? `${pathname}?room_id=${encodeURIComponent(activeThreadId)}` : pathname
    startTransition(() => {
      router.replace(next, { scroll: false })
    })
  }, [activeThreadId, currentRoomId, pathname, router])

  useEffect(() => {
    const container = threadRef.current
    if (!container) return

    const threadChanged = previousThreadRef.current !== activeThreadId
    const hasNewLatestMessage = Boolean(activeLastMessageId) && previousLastMessageIdRef.current !== activeLastMessageId
    if (threadChanged || hasNewLatestMessage) {
      container.scrollTop = container.scrollHeight
    }

    previousThreadRef.current = activeThreadId
    previousLastMessageIdRef.current = activeLastMessageId
  }, [activeThreadId, activeLastMessageId, activeMessagesLength])

  useEffect(() => {
    const channel = supabase.channel(`${COMMERCE_CHAT_ENGINE.realtimeChannelPrefix}:${portal}:${userId}`)

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: COMMERCE_CHAT_ENGINE.realtimeTables[0] },
      async (payload) => {
        const threadId = String((payload.new as { id?: string } | null)?.id || (payload.old as { id?: string } | null)?.id || "").trim()
        if (!threadId) return

        if (payload.eventType === "DELETE") {
          removeThreadLocally(threadId)
          return
        }

        const thread = await fetchThreadMeta(threadId)
        if (!thread) {
          await refreshThreads()
          return
        }
        upsertThreadLocally(thread)
        if (portal === "merchant") {
          scheduleSnapshotRefresh(180)
        }
      },
    )

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: COMMERCE_CHAT_ENGINE.realtimeTables[1] },
      async (payload) => {
        const message = payload.new as CommerceChatMessageItem
        if (!message?.thread_id) return

        setMessagesByThread((current) => {
          const existing = current[message.thread_id] || []
          if (existing.some((item) => item.id === message.id)) return current
          return {
            ...current,
            [message.thread_id]: [...existing, message],
          }
        })

        const thread = await fetchThreadMeta(message.thread_id)
        if (thread) {
          upsertThreadLocally(thread)
        }

        if (message.thread_id === activeThreadIdRef.current && message.sender_user_id !== userId) {
          await refreshLatestMessages(message.thread_id)
        }

        if (portal === "merchant") {
          scheduleSnapshotRefresh(120)
        }
      },
    )

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setRealtimeStatus("live")
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setRealtimeStatus("fallback")
      } else {
        setRealtimeStatus("connecting")
      }
    })

    return () => {
      if (queuedSnapshotRefreshTimeoutRef.current) {
        window.clearTimeout(queuedSnapshotRefreshTimeoutRef.current)
        queuedSnapshotRefreshTimeoutRef.current = null
      }
      void supabase.removeChannel(channel)
    }
  }, [fetchThreadMeta, portal, refreshLatestMessages, refreshThreads, removeThreadLocally, scheduleSnapshotRefresh, supabase, upsertThreadLocally, userId])

  useEffect(() => {
    let cancelled = false

    const refreshSnapshot = async () => {
      if (cancelled) return
      try {
        await refreshSnapshotNow()
      } catch {}
    }

    const shouldPollFallback = realtimeStatus === "fallback"
    const shouldPollForFirstMerchantThread = realtimeStatus === "live" && portal === "merchant" && threads.length === 0

    if (shouldPollFallback || shouldPollForFirstMerchantThread) {
      void refreshSnapshot()
    }

    const intervalId = shouldPollFallback || shouldPollForFirstMerchantThread
      ? window.setInterval(() => {
          void refreshSnapshot()
        }, shouldPollFallback ? SNAPSHOT_FALLBACK_INTERVAL_MS : SNAPSHOT_LIVE_EMPTY_INTERVAL_MS)
      : null

    const handleFocus = () => {
      if (realtimeStatus === "fallback" || (portal === "merchant" && threadsRef.current.length === 0)) {
        void refreshSnapshot()
      }
    }

    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        (realtimeStatus === "fallback" || (portal === "merchant" && threadsRef.current.length === 0))
      ) {
        void refreshSnapshot()
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      cancelled = true
      if (intervalId) {
        window.clearInterval(intervalId)
      }
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [portal, realtimeStatus, refreshSnapshotNow, threads.length])

  useEffect(() => {
    let cancelled = false
    void refreshThreadListNow()
    const intervalId = window.setInterval(() => {
      if (cancelled) return
      void refreshThreadListNow()
    }, THREAD_LIST_SYNC_INTERVAL_MS)

    const handleFocus = () => {
      if (cancelled) return
      void refreshThreadListNow()
    }

    const handleVisibility = () => {
      if (cancelled) return
      if (document.visibilityState === "visible") {
        void refreshThreadListNow()
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [refreshThreadListNow])

  useEffect(() => {
    if (!activeThreadId) {
      setErrorMessage("")
      setDraftMessage("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    if (threads.some((thread) => thread.id === activeThreadId)) return

    setErrorMessage("")
    setDraftMessage("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [activeThreadId, threads])

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeThreadId) return
    const attachment = fileInputRef.current?.files?.[0] || null
    if (!draftMessage.trim() && !attachment) {
      setErrorMessage("Pesan atau lampiran wajib diisi.")
      return
    }

    setSending(true)
    setSendPhase(attachment ? "compressing" : "uploading")
    setErrorMessage("")
    const clientMessageId = buildClientMessageId()

    try {
      const preparedAttachment = await optimizeAttachmentBeforeSend(attachment)
      const formData = new FormData()
      formData.set("thread_id", activeThreadId)
      formData.set("message", draftMessage.trim())
      formData.set("client_message_id", clientMessageId)
      if (preparedAttachment) {
        formData.set("attachment", preparedAttachment)
      }

      setSendPhase("uploading")
      const response = await fetch(COMMERCE_CHAT_ENGINE.sendEndpoint, {
        method: "POST",
        body: formData,
      })
      const payload = (await response.json()) as SendMessageResponse
      if (!response.ok || payload.error || !payload.message) {
        throw new Error(payload.error || "Gagal kirim pesan chat.")
      }

      setMessagesByThread((current) => {
        const existing = current[activeThreadId] || []
        if (existing.some((item) => item.id === payload.message!.id)) return current
        return { ...current, [activeThreadId]: [...existing, payload.message!] }
      })

      const thread = await fetchThreadMeta(activeThreadId)
      if (thread) {
        upsertThreadLocally(thread)
      }

      setDraftMessage("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal kirim pesan chat.")
    } finally {
      setSending(false)
      setSendPhase("idle")
    }
  }

  async function handleDeleteThread() {
    if (!activeThread) return

    setDeletingThreadId(activeThread.id)
    deletingThreadIdRef.current = activeThread.id
    setErrorMessage("")

    try {
      const response = await fetch("/api/commerce-chat/thread/delete", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ threadId: activeThread.id }),
      })
      const payload = (await response.json().catch(() => null)) as DeleteThreadResponse | null
      if (!response.ok || payload?.error || !payload?.deletedThreadId) {
        throw new Error(payload?.error || "Gagal menghapus room chat.")
      }

      const deletedThreadId = payload.deletedThreadId
      removeThreadLocally(deletedThreadId)
      setErrorMessage("")
      setDraftMessage("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      if (isCommerceThreadAccessError(error)) {
        if (activeThread?.id) {
          handleInaccessibleThread(activeThread.id)
        }
        setErrorMessage("")
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Gagal menghapus room chat.")
      }
    } finally {
      deletingThreadIdRef.current = ""
      setDeletingThreadId("")
    }
  }

  function handleDraftKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    if (!activeThread || sending || !draftMessage.trim()) return
    event.currentTarget.form?.requestSubmit()
  }

  function handleThreadScroll(event: React.UIEvent<HTMLDivElement>) {
    if (!activeThreadId || !activeHasMore || activeLoadingOlder) return
    if (event.currentTarget.scrollTop > 80) return
    void loadOlderMessages(activeThreadId)
  }

  const realtimeBadge =
    realtimeStatus === "live"
      ? { label: "Live", className: "border-emerald-200 bg-emerald-50 text-emerald-700" }
      : realtimeStatus === "fallback"
        ? { label: "Fallback", className: "border-orange-200 bg-orange-50 text-orange-700" }
        : { label: "Menghubungkan", className: "border-amber-200 bg-amber-50 text-amber-700" }

  return (
    <>
      <section className="rounded-[32px] border border-orange-200/70 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_26px_90px_rgba(146,64,14,0.2)]">
        <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-orange-50">
          {headline.badge}
        </p>
        <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          {headline.title}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-50/90 md:text-base">
          {headline.description}
        </p>
      </section>

      {errorMessage ? (
        <div className="mt-6 rounded-[20px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8 overflow-hidden rounded-[30px] border border-[#e9dccb] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="grid h-[78vh] min-h-[640px] gap-0 lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className={`flex min-h-0 flex-col border-r border-[#efe3d1] ${CHAT_DESIGN_LOCK.panelBackground}`}>
            <div className="border-b border-[#efe3d1] px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">
                  {portal === "merchant" ? "Inbox Merchant" : "Chat Customer"}
                </p>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${realtimeBadge.className}`}>
                  {realtimeBadge.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Thread: {threads.length} | Unread: {unreadCount}</p>
            </div>

            <div className="border-b border-[#efe3d1] bg-white px-3 py-3">
              <input
                value={threadSearch}
                onChange={(event) => setThreadSearch(event.target.value)}
                placeholder="Cari percakapan..."
                className="h-10 w-full rounded-[12px] border border-[#e1d8ca] bg-[#fffdf9] px-3 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {visibleThreads.map((thread) => {
                const active = thread.id === activeThreadId
                const hasUnread =
                  !!thread.lastMessageAt &&
                  !!thread.lastMessageSenderRole &&
                  thread.lastMessageSenderRole !== "system" &&
                  thread.lastMessageSenderRole !== thread.currentUserActorRole &&
                  (!thread.currentUserLastReadAt || thread.lastMessageAt > thread.currentUserLastReadAt)

                return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        activeThreadIdRef.current = thread.id
                        setActiveThreadId(thread.id)
                      }}
                      className={`mb-1 w-full rounded-[12px] px-3 py-3 text-left transition ${
                        active ? "bg-[#fff2e8]" : "hover:bg-[#f4f5f7]"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {portal === "merchant" ? thread.customerLabel : thread.merchantLabel}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.18em] text-orange-500">
                          {thread.packageTitle || "Inquiry"}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {thread.lastMessagePreview || "Belum ada pesan."}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(thread.lastMessageAt || thread.updatedAt)}
                        </span>
                        {hasUnread ? (
                          <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                            1+
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                )
              })}
              {visibleThreads.length === 0 ? (
                <div className="px-3 py-4 text-xs text-slate-500">Belum ada percakapan yang cocok.</div>
              ) : null}
            </div>
          </aside>

          <section className={`flex min-h-0 flex-col ${CHAT_DESIGN_LOCK.threadBackground}`}>
            <div className={`sticky top-0 z-10 border-b border-[#efe3d1] px-5 py-3 ${CHAT_DESIGN_LOCK.panelBackground}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {activeThread ? (portal === "merchant" ? activeThread.customerLabel : activeThread.merchantLabel) : "Pilih chat"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {activeThread?.packageTitle || "Percakapan inquiry commerce"}
                  </p>
                </div>
                {activeThread ? (
                  <button
                    type="button"
                    onClick={handleDeleteThread}
                    disabled={deletingThreadId === activeThread.id}
                    className="shrink-0 rounded-[12px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingThreadId === activeThread.id ? "Menghapus..." : "Hapus room"}
                  </button>
                ) : null}
              </div>
            </div>

            <div
              ref={threadRef}
              onScroll={handleThreadScroll}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-2 px-4 py-4"
            >
              {activeThread && activeLoadingOlder ? (
                <div className="mb-2 flex justify-center">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500">
                    Memuat pesan lama...
                  </span>
                </div>
              ) : null}
              {activeThread && !activeHasMore && activeMessages.length > 0 ? (
                <div className="mb-2 flex justify-center">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500">
                    Awal percakapan
                  </span>
                </div>
              ) : null}
              {!activeThread ? (
                <div className="rounded-[12px] bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                  Pilih chat di kiri untuk mulai.
                </div>
              ) : activeMessages.length === 0 ? (
                <div className="rounded-[12px] bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                  Belum ada pesan di thread ini.
                </div>
              ) : (
                activeMessages.map((message) => {
                  const mine = message.sender_user_id === userId
                  const bubbleClass =
                    message.sender_role === "system"
                      ? "border border-slate-200 bg-white text-slate-500"
                      : mine
                        ? CHAT_DESIGN_LOCK.ownBubble
                        : CHAT_DESIGN_LOCK.peerBubble

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_role === "system" ? "justify-center" : mine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div className={`max-w-[78%] rounded-[12px] px-3 py-2 text-sm shadow-sm ${bubbleClass}`}>
                        {message.body ? <p className="whitespace-pre-line leading-6">{message.body}</p> : null}
                        {message.attachment_url ? (
                          <div className={message.body ? "mt-3" : ""}>
                            {isCommerceChatImageAttachment(message.attachment_mime_type) ? (
                              <a
                                href={message.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="block overflow-hidden rounded-[12px] border border-white/20 bg-white/10"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={message.attachment_url}
                                  alt={message.attachment_name || "Lampiran"}
                                  className="max-h-64 w-full object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={message.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-[12px] border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                              >
                                {message.attachment_name || "Lampiran"}
                              </a>
                            )}
                          </div>
                        ) : null}
                        <p className="mt-1 text-right text-[10px] text-slate-400">{formatDateTime(message.created_at)}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className={`sticky bottom-0 border-t border-[#efe3d1] px-4 py-3 ${CHAT_DESIGN_LOCK.panelBackground}`}>
              <div className="mb-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  name="attachment"
                  disabled={!activeThread || Boolean(deletingThreadId)}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="block w-full rounded-[12px] border border-[#dcd2c3] bg-white px-3 py-2 text-xs text-slate-600 file:mr-2 file:rounded-full file:border-0 file:bg-orange-100 file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-orange-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  onKeyDown={handleDraftKeyDown}
                  disabled={!activeThread || Boolean(deletingThreadId)}
                  placeholder="Tulis pesan... (Enter kirim, Shift+Enter baris baru)"
                  className="h-12 max-h-28 min-h-12 flex-1 rounded-[12px] border border-[#dcd2c3] bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
                <button
                  type="submit"
                  disabled={!activeThread || sending || Boolean(deletingThreadId)}
                  className="h-12 rounded-[12px] bg-[#ff6a00] px-5 text-sm font-semibold text-white transition hover:bg-[#ea6100] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {sending ? (sendPhase === "compressing" ? "Siapkan..." : "Upload...") : "Kirim"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
    </>
  )
}
