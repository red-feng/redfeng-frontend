"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { isImageAttachment } from "@/lib/chat/attachments"
import { shouldMarkRoomReadOnActivation } from "@/lib/chat/auth-flow-policy.mjs"
import { isActiveChatBooking, isCompletedChatBooking } from "@/lib/chat/booking-room-status"
import { parseChatSystemMessage } from "@/lib/chat/system-messages"
import { CHAT_DESIGN_LOCK } from "@/lib/chat-design-lock"

type MerchantChatRoom = {
  id: string
  packageId: string
  packageTitle: string | null
  packageSlug: string | null
  packageCoverImage: string | null
  customerId: string
  merchantUserId: string
  bookingId: string | null
  bookingCode: string | null
  bookingStatus: string | null
  paymentStatus: string | null
  customerName: string | null
  lastMessagePreview: string | null
  updatedAt: string | null
  lastMessageAt: string | null
  lastMessageSenderId: string | null
  merchantLastReadAt: string | null
  customerLastReadAt: string | null
}

type MerchantChatMessage = {
  id: string
  room_id: string
  sender_id: string
  message: string
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_mime_type?: string | null
  created_at: string | null
}

type RealtimeStatus = "connecting" | "live" | "fallback"
type RoomCursor = {
  updatedAt: string
  roomId: string
}

type MerchantChatRealtimeClientProps = {
  userId: string
  initialRooms: MerchantChatRoom[]
  initialRoomsHasMore: boolean
  initialRoomsCursor: RoomCursor | null
  initialActiveRoomId: string
  initialSelectionWasExplicit: boolean
  initialMessages: MerchantChatMessage[]
  initialHasMore: boolean
  initialOldestCreatedAt: string | null
  text: {
    customerRooms: string
    conversationList: string
    searchPlaceholder: string
    searchButton: string
    clearSearch: string
    hideRoom: string
    hidingRoom: string
    allFilter: string
    unreadFilter: string
    bookingFilter: string
    searchResultLabel: string
    noSearchResult: string
    newBadge: string
    noChats: string
    packageLabel: string
    packageNotFound: string
    bookingLabel: string
    lastUpdated: string
    viewPackage: string
    conversationFocus: string
    selectChatRoom: string
    selectRoomToViewMerchant: string
    viewPackageDetail: string
    threadType: string
    statusLabel: string
    activeTransaction: string
    completedTransaction: string
    leadInquiry: string
    noMessages: string
    attachmentLabel: string
    attachmentHint: string
    replyPlaceholder: string
    sendButton: string
    beforeBooking: string
    afterBooking: string
    completedBooking: string
    allChats: string
    totalRoomsOnInbox: string
    newChats: string
    unreadByMerchant: string
    activeRoomMessages: string
    currentConversation: string
    selectRoomToView: string
    bookingCreatedCard: string
    viewBookingDetail: string
    packageInquiryCard: string
  }
}

type RoomMetaResponse = {
  room?: MerchantChatRoom
}

type SendMessageResponse = {
  roomId?: string
  message?: MerchantChatMessage
  error?: string
}

type ChatMessagesPageResponse = {
  messages?: MerchantChatMessage[]
  hasMore?: boolean
  oldestCreatedAt?: string | null
  error?: string
}
type RoomsPageResponse = {
  rooms?: MerchantChatRoom[]
  hasMore?: boolean
  nextCursor?: RoomCursor | null
  error?: string
}

function sortRooms(rooms: MerchantChatRoom[]) {
  return [...rooms].sort((left, right) => {
    const leftDate = left.lastMessageAt || left.updatedAt || ""
    const rightDate = right.lastMessageAt || right.updatedAt || ""
    return rightDate.localeCompare(leftDate)
  })
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatInboxDate(dateStr: string | null) {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return "-"
  const now = new Date()
  const sameYear = now.getFullYear() === date.getFullYear()
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    ...(sameYear ? {} : { year: "2-digit" }),
  })
}

function getPaymentBadgeLabel(paymentStatus: string | null | undefined) {
  const normalized = String(paymentStatus || "").trim().toLowerCase()
  if (normalized === "paid") return "Lunas"
  if (normalized === "dp_paid") return "DP Paid"
  if (normalized === "pending" || normalized === "unpaid") return "Menunggu pembayaran"
  return "Booking terhubung"
}

function getMerchantRoomPreview(room: MerchantChatRoom) {
  const preview = String(room.lastMessagePreview || "").trim()
  if (preview) return preview
  return "Belum ada pesan."
}

function getAvatarInitial(name: string | null | undefined, fallback = "U") {
  const text = String(name || "").trim()
  if (!text) return fallback
  return text.charAt(0).toUpperCase()
}

function getReadReceipt(createdAt: string | null, otherPartyLastReadAt: string | null) {
  if (!createdAt) return "✓"
  if (!otherPartyLastReadAt) return "✓"

  const createdTs = Date.parse(createdAt)
  const readTs = Date.parse(otherPartyLastReadAt)
  if (Number.isNaN(createdTs) || Number.isNaN(readTs)) {
    return otherPartyLastReadAt >= createdAt ? "✓✓" : "✓"
  }
  return readTs >= createdTs ? "✓✓" : "✓"
}

export default function MerchantChatRealtimeClient({
  userId,
  initialRooms,
  initialRoomsHasMore,
  initialRoomsCursor,
  initialActiveRoomId,
  initialSelectionWasExplicit,
  initialMessages,
  initialHasMore,
  initialOldestCreatedAt,
  text: t,
}: MerchantChatRealtimeClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const [rooms, setRooms] = useState<MerchantChatRoom[]>(() => sortRooms(initialRooms))
  const [activeRoomId, setActiveRoomId] = useState(initialActiveRoomId)
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, MerchantChatMessage[]>>(() =>
    initialActiveRoomId ? { [initialActiveRoomId]: initialMessages } : {},
  )
  const [loadedRoomIds, setLoadedRoomIds] = useState<Record<string, true>>(() =>
    initialActiveRoomId ? { [initialActiveRoomId]: true } : {},
  )
  const [hasMoreByRoom, setHasMoreByRoom] = useState<Record<string, boolean>>(() =>
    initialActiveRoomId ? { [initialActiveRoomId]: initialHasMore } : {},
  )
  const [oldestByRoom, setOldestByRoom] = useState<Record<string, string | null>>(() =>
    initialActiveRoomId ? { [initialActiveRoomId]: initialOldestCreatedAt } : {},
  )
  const [loadingOlderByRoom, setLoadingOlderByRoom] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "booking">("all")
  const [draftMessage, setDraftMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [hidingRoomId, setHidingRoomId] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting")
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false)
  const [roomsHasMore, setRoomsHasMore] = useState(initialRoomsHasMore)
  const [roomsCursor, setRoomsCursor] = useState<RoomCursor | null>(initialRoomsCursor)
  const [loadingMoreRooms, setLoadingMoreRooms] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const threadRef = useRef<HTMLDivElement | null>(null)
  const roomListRef = useRef<HTMLDivElement | null>(null)
  const shouldAutoMarkActiveRoomReadRef = useRef(initialSelectionWasExplicit)
  const previousRoomRef = useRef("")
  const previousLastMessageIdRef = useRef("")

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const unreadRoomsCount = useMemo(
    () =>
      rooms.filter((room) => {
        if (!room.lastMessageSenderId || room.lastMessageSenderId === userId) return false
        if (!room.lastMessageAt) return false
        if (!room.merchantLastReadAt) return true
        return room.lastMessageAt > room.merchantLastReadAt
      }).length,
    [rooms, userId],
  )
  const bookingRoomsCount = useMemo(() => rooms.filter((room) => isActiveChatBooking(room)).length, [rooms])

  const visibleRooms = useMemo(() => {
    return rooms.filter((room) => {
      const hasUnread =
        room.lastMessageSenderId &&
        room.lastMessageSenderId !== userId &&
        (!room.merchantLastReadAt || (room.lastMessageAt || "") > room.merchantLastReadAt)

      if (activeFilter === "unread" && !hasUnread) return false
      if (activeFilter === "booking" && !isActiveChatBooking(room)) return false

      if (!normalizedSearchQuery) return true

      const haystack = [room.customerName || `Customer ${room.customerId.slice(0, 8)}`, room.bookingCode || "", room.packageTitle || ""]
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalizedSearchQuery)
    })
  }, [activeFilter, normalizedSearchQuery, rooms, userId])

  const activeRoom = visibleRooms.find((room) => room.id === activeRoomId) || rooms.find((room) => room.id === activeRoomId) || null
  const messages = messagesByRoom[activeRoomId] || []
  const messagesLength = messages.length
  const lastMessageId = messages[messagesLength - 1]?.id || ""
  const activeHasMore = Boolean(hasMoreByRoom[activeRoomId])
  const activeLoadingOlder = Boolean(loadingOlderByRoom[activeRoomId])
  const unreadCount = useMemo(
    () =>
      visibleRooms.filter((room) => {
        if (!room.lastMessageSenderId || room.lastMessageSenderId === userId) return false
        if (!room.lastMessageAt) return false
        if (!room.merchantLastReadAt) return true
        return room.lastMessageAt > room.merchantLastReadAt
      }).length,
    [userId, visibleRooms],
  )

  const fetchRoomMeta = useCallback(async (roomId: string) => {
    try {
      const response = await fetch(`/api/chat/room-meta?roomId=${encodeURIComponent(roomId)}`, { cache: "no-store" })
      if (!response.ok) return null
      const payload = (await response.json()) as RoomMetaResponse
      return payload.room || null
    } catch (error) {
      console.error("Failed to fetch merchant chat room meta", error)
      return null
    }
  }, [])

  const fetchMessagesPage = useCallback(async (roomId: string, beforeCreatedAt?: string | null) => {
    const search = new URLSearchParams({ roomId })
    if (beforeCreatedAt) {
      search.set("beforeCreatedAt", beforeCreatedAt)
    }
    const response = await fetch(`/api/chat/messages?${search.toString()}`, { cache: "no-store" })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ChatMessagesPageResponse | null
      throw new Error(payload?.error || "Failed to fetch merchant chat messages.")
    }
    return (await response.json()) as ChatMessagesPageResponse
  }, [])

  const fetchLatestMessages = useCallback(async (roomId: string) => {
    try {
      const payload = await fetchMessagesPage(roomId)
      const nextMessages = (payload.messages || []).slice().sort((left, right) => {
        const leftDate = left.created_at || ""
        const rightDate = right.created_at || ""
        if (leftDate === rightDate) return left.id.localeCompare(right.id)
        return leftDate.localeCompare(rightDate)
      })
      setMessagesByRoom((current) => ({ ...current, [roomId]: nextMessages }))
      setLoadedRoomIds((current) => ({ ...current, [roomId]: true }))
      setHasMoreByRoom((current) => ({ ...current, [roomId]: Boolean(payload.hasMore) }))
      setOldestByRoom((current) => ({
        ...current,
        [roomId]: payload.oldestCreatedAt || nextMessages[0]?.created_at || null,
      }))
    } catch (error) {
      console.error("Failed to fetch merchant chat messages", error)
    }
  }, [fetchMessagesPage])

  const loadOlderMessages = useCallback(async (roomId: string) => {
    if (!roomId) return
    if (loadingOlderByRoom[roomId]) return
    if (!hasMoreByRoom[roomId]) return
    const beforeCreatedAt = oldestByRoom[roomId]
    if (!beforeCreatedAt) return

    const container = threadRef.current
    const prevHeight = container?.scrollHeight || 0
    const prevTop = container?.scrollTop || 0

    setLoadingOlderByRoom((current) => ({ ...current, [roomId]: true }))
    try {
      const payload = await fetchMessagesPage(roomId, beforeCreatedAt)
      const olderMessages = payload.messages || []
      if (olderMessages.length > 0) {
        setMessagesByRoom((current) => {
          const existing = current[roomId] || []
          const merged = new Map<string, MerchantChatMessage>()
          for (const item of olderMessages) merged.set(item.id, item)
          for (const item of existing) merged.set(item.id, item)
          const next = [...merged.values()].sort((left, right) => {
            const leftDate = left.created_at || ""
            const rightDate = right.created_at || ""
            if (leftDate === rightDate) return left.id.localeCompare(right.id)
            return leftDate.localeCompare(rightDate)
          })
          return { ...current, [roomId]: next }
        })

        requestAnimationFrame(() => {
          const nextContainer = threadRef.current
          if (!nextContainer) return
          const nextHeight = nextContainer.scrollHeight
          nextContainer.scrollTop = Math.max(0, nextHeight - prevHeight + prevTop)
        })
      }

      setHasMoreByRoom((current) => ({ ...current, [roomId]: Boolean(payload.hasMore) }))
      setOldestByRoom((current) => ({
        ...current,
        [roomId]: payload.oldestCreatedAt || olderMessages[0]?.created_at || current[roomId] || null,
      }))
    } catch (error) {
      console.error("Failed to fetch older merchant chat messages", error)
      setHasMoreByRoom((current) => ({ ...current, [roomId]: false }))
    } finally {
      setLoadingOlderByRoom((current) => ({ ...current, [roomId]: false }))
    }
  }, [fetchMessagesPage, hasMoreByRoom, loadingOlderByRoom, oldestByRoom])

  const markRoomRead = useCallback(async (roomId: string) => {
    const nowIso = new Date().toISOString()
    try {
      const { error } = await supabase
        .from("package_chat_rooms")
        .update({ merchant_last_read_at: nowIso })
        .eq("id", roomId)

      if (!error) {
        setRooms((current) =>
          current.map((room) => (room.id === roomId ? { ...room, merchantLastReadAt: nowIso } : room)),
        )
      }
    } catch (error) {
      console.error("Failed to mark merchant room as read", error)
    }
  }, [supabase])

  useEffect(() => {
    if (!activeRoomId) return
    if (!loadedRoomIds[activeRoomId]) {
      void fetchLatestMessages(activeRoomId)
    }
    if (
      !shouldMarkRoomReadOnActivation({
        initialSelectionWasExplicit,
        hasAlreadySkippedInitialAutoRead: shouldAutoMarkActiveRoomReadRef.current,
      })
    ) {
      shouldAutoMarkActiveRoomReadRef.current = true
      return
    }
    void markRoomRead(activeRoomId)
  }, [activeRoomId, fetchLatestMessages, initialSelectionWasExplicit, loadedRoomIds, markRoomRead])

  useEffect(() => {
    const container = threadRef.current
    if (!container) return
    const roomChanged = previousRoomRef.current !== activeRoomId
    const hasNewLastMessage = Boolean(lastMessageId) && previousLastMessageIdRef.current !== lastMessageId
    if (roomChanged || hasNewLastMessage) {
      container.scrollTop = container.scrollHeight
    }
    previousRoomRef.current = activeRoomId
    previousLastMessageIdRef.current = lastMessageId
  }, [activeRoomId, lastMessageId, messagesLength])

  useEffect(() => {
    const channel = supabase.channel(`merchant-chat-live:${userId}`)

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "package_chat_rooms" },
      async (payload) => {
        try {
          const nextRoom = payload.new as { id?: string } | null
          const previousRoom = payload.old as { id?: string } | null
          const payloadRoomId = String(nextRoom?.id || previousRoom?.id || "").trim()
          if (!payloadRoomId) return

          if (payload.eventType === "DELETE") {
            setRooms((current) => current.filter((room) => room.id !== payloadRoomId))
            return
          }

          const room = await fetchRoomMeta(payloadRoomId)
          if (!room) return

          setRooms((current) => {
            const next = current.filter((item) => item.id !== room.id)
            next.push(room)
            return sortRooms(next)
          })
        } catch (error) {
          console.error("Failed to process merchant room realtime update", error)
        }
      },
    )

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "package_chat_messages" },
      async (payload) => {
        try {
          const message = payload.new as MerchantChatMessage
          if (!message?.room_id) return

          setMessagesByRoom((current) => {
            const existing = current[message.room_id] || []
            if (existing.some((item) => item.id === message.id)) {
              return current
            }
            return {
              ...current,
              [message.room_id]: [...existing, message],
            }
          })

          const room = await fetchRoomMeta(message.room_id)
          if (room) {
            setRooms((current) => {
              const next = current.filter((item) => item.id !== room.id)
              next.push(room)
              return sortRooms(next)
            })
          }

          if (message.room_id === activeRoomId && message.sender_id !== userId) {
            void markRoomRead(message.room_id)
          }
        } catch (error) {
          console.error("Failed to process merchant message realtime update", error)
        }
      },
    )

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setRealtimeStatus("live")
        return
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setRealtimeStatus("fallback")
        return
      }
      setRealtimeStatus("connecting")
    })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [activeRoomId, fetchRoomMeta, initialSelectionWasExplicit, markRoomRead, supabase, userId])

  const realtimeBadge =
    realtimeStatus === "live"
      ? {
          label: "Live",
          className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        }
      : realtimeStatus === "fallback"
        ? {
            label: "Fallback sync",
            className: "border-orange-200 bg-orange-50 text-orange-700",
          }
        : {
            label: "Menghubungkan",
            className: "border-amber-200 bg-amber-50 text-amber-700",
          }

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeRoomId) return

    const attachment = fileInputRef.current?.files?.[0] || null
    if (!draftMessage.trim() && !attachment) {
      setErrorMessage("Pesan atau lampiran wajib diisi.")
      return
    }

    setSubmitting(true)
    setErrorMessage("")

    try {
      const formData = new FormData()
      formData.set("room_id", activeRoomId)
      formData.set("message", draftMessage)
      if (attachment) formData.set("attachment", attachment)

      const response = await fetch("/api/chat/send", {
        method: "POST",
        body: formData,
      })

      const payload = (await response.json()) as SendMessageResponse
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Gagal kirim pesan.")
      }

      const nextMessage = payload.message
      if (nextMessage) {
        setMessagesByRoom((current) => {
          const targetRoomId = nextMessage.room_id || activeRoomId
          const existing = current[targetRoomId] || []
          if (existing.some((item) => item.id === nextMessage.id)) {
            return current
          }
          return {
            ...current,
            [targetRoomId]: [...existing, nextMessage],
          }
        })
      }

      const room = await fetchRoomMeta(payload.roomId || activeRoomId)
      if (room) {
        setRooms((current) => {
          const next = current.filter((item) => item.id !== room.id)
          next.push(room)
          return sortRooms(next)
        })
      }

      setDraftMessage("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal kirim pesan.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleHideRoom(roomId: string) {
    setErrorMessage("")
    setHidingRoomId(roomId)
    try {
      const response = await fetch("/api/chat/hide-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        throw new Error(payload?.error || "Gagal menyembunyikan room.")
      }

      setRooms((current) => {
        const next = current.filter((room) => room.id !== roomId)
        if (activeRoomId === roomId) {
          setActiveRoomId(next[0]?.id || "")
          if (next.length === 0) {
            setMobileThreadOpen(false)
          }
        }
        return next
      })
      setMessagesByRoom((current) => {
        const next = { ...current }
        delete next[roomId]
        return next
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal menyembunyikan room.")
    } finally {
      setHidingRoomId("")
    }
  }

  function handleSelectRoom(roomId: string) {
    shouldAutoMarkActiveRoomReadRef.current = true
    setActiveRoomId(roomId)
    setMobileThreadOpen(true)
    void markRoomRead(roomId)
  }

  function handleBackToRoomList() {
    setMobileThreadOpen(false)
  }

  async function loadMoreRooms() {
    if (loadingMoreRooms || !roomsHasMore || !roomsCursor?.updatedAt || !roomsCursor?.roomId) return
    setLoadingMoreRooms(true)
    try {
      const search = new URLSearchParams({
        mode: "merchant",
        limit: "30",
        beforeUpdatedAt: roomsCursor.updatedAt,
        beforeRoomId: roomsCursor.roomId,
      })
      const response = await fetch(`/api/chat/rooms?${search.toString()}`, { cache: "no-store" })
      const payload = (await response.json()) as RoomsPageResponse
      if (!response.ok) {
        throw new Error(payload.error || "Gagal memuat room berikutnya.")
      }
      const nextRooms = payload.rooms || []
      setRooms((current) => {
        const map = new Map<string, MerchantChatRoom>()
        for (const row of current) map.set(row.id, row)
        for (const row of nextRooms) map.set(row.id, row)
        return sortRooms([...map.values()])
      })
      setRoomsHasMore(Boolean(payload.hasMore))
      setRoomsCursor(payload.nextCursor || null)
    } catch (error) {
      console.error("Failed to load more merchant rooms", error)
      setRoomsHasMore(false)
    } finally {
      setLoadingMoreRooms(false)
    }
  }

  function handleRoomListScroll(event: React.UIEvent<HTMLDivElement>) {
    const node = event.currentTarget
    const remaining = node.scrollHeight - node.scrollTop - node.clientHeight
    if (remaining > 120) return
    void loadMoreRooms()
  }

  function handleThreadScroll(event: React.UIEvent<HTMLDivElement>) {
    if (!activeRoomId || !activeHasMore || activeLoadingOlder) return
    if (event.currentTarget.scrollTop > 80) return
    void loadOlderMessages(activeRoomId)
  }

  function handleDraftKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    if (submitting || !activeRoomId || !draftMessage.trim()) return
    const form = event.currentTarget.form
    if (form) {
      form.requestSubmit()
    }
  }

  return (
    <section className="mt-4 overflow-hidden rounded-none border border-[#f3dbc3] bg-white shadow-none md:mt-8 md:rounded-[32px] md:shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="grid h-[100dvh] min-h-[100dvh] gap-0 md:h-[78vh] md:min-h-[660px] lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside
          className={`h-full min-h-0 flex-col border-r border-[#efe3d1] bg-white p-0 lg:overflow-hidden lg:bg-[#f8f9fa] lg:p-4 ${
            mobileThreadOpen ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="border-b border-[#ececec] bg-white px-4 pb-3 pt-4 lg:hidden">
            <div className="flex items-center gap-3">
              <Image
                src="/redfeng-favicon.png"
                alt="RedFeng"
                width={34}
                height={34}
                className="h-[34px] w-[34px]"
              />
              <h2 className="text-[26px] font-semibold tracking-[-0.01em] text-slate-900">Chat</h2>
            </div>
            <div className="mt-3 rounded-[8px] bg-[#f1f1f1] px-3 py-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="⌕  Cari Kontak, Penjual, & Pesan"
                className="h-8 w-full bg-transparent text-[14px] text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="hidden items-center justify-between gap-3 lg:flex">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{t.customerRooms}</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">{t.conversationList}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${realtimeBadge.className}`}>
                {realtimeBadge.label}
              </span>
              {unreadCount > 0 ? <span className="rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white">{unreadCount} {t.newBadge}</span> : null}
            </div>
          </div>

          <div className="mt-4 hidden flex-wrap gap-2 lg:flex">
            {[
              { key: "all" as const, label: t.allFilter, count: rooms.length },
              { key: "unread" as const, label: t.unreadFilter, count: unreadRoomsCount },
              { key: "booking" as const, label: t.bookingFilter, count: bookingRoomsCount },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveFilter(item.key)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  activeFilter === item.key
                    ? "border-orange-200 bg-orange-100 text-orange-700"
                    : "border-[#e6d8c2] bg-white text-slate-600 hover:border-orange-200 hover:text-orange-700"
                }`}
              >
                <span>{item.label}</span>{" "}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${activeFilter === item.key ? "bg-white/80 text-orange-700" : "bg-slate-100 text-slate-500"}`}>
                  {item.count}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 hidden gap-2 lg:flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="h-11 flex-1 rounded-[18px] border border-[#e6d8c2] bg-white px-4 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2"
            />
            <button
              type="button"
              onClick={() => setSearchQuery(searchQuery.trim())}
              className="rounded-[18px] border border-orange-200 bg-orange-50 px-4 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
            >
              {t.searchButton}
            </button>
            {searchQuery || activeFilter !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setActiveFilter("all")
                }}
                className="inline-flex items-center rounded-[18px] border border-[#e6d8c2] bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-orange-200 hover:text-orange-700"
              >
                {t.clearSearch}
              </button>
            ) : null}
          </div>

          {searchQuery ? (
            <p className="mt-3 hidden text-xs font-medium text-slate-500 lg:block">
              {t.searchResultLabel}: <span className="text-slate-700">&quot;{searchQuery}&quot;</span>
            </p>
          ) : null}

          <div
            ref={roomListRef}
            onScroll={handleRoomListScroll}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-0 lg:mt-4 lg:space-y-3 lg:pr-1"
          >
            {visibleRooms.length === 0 && searchQuery ? <div className="rounded-[22px] border border-[#eadfce] bg-white px-4 py-4 text-sm leading-6 text-slate-600">{t.noSearchResult}</div> : null}
            {visibleRooms.length === 0 && !searchQuery ? <div className="rounded-[22px] border border-dashed border-[#e3d4be] bg-white px-4 py-4 text-sm leading-6 text-slate-600">{t.noChats}</div> : null}

            {visibleRooms.map((room) => {
              const completedBooking = isCompletedChatBooking(room)
              const activeBooking = isActiveChatBooking(room)
              const hasUnread =
                room.lastMessageSenderId &&
                room.lastMessageSenderId !== userId &&
                (!room.merchantLastReadAt || (room.lastMessageAt || "") > room.merchantLastReadAt)

              return (
                <div
                  key={room.id}
                  className={`border-b border-[#ececec] bg-white px-4 py-3.5 last:border-b-0 lg:rounded-[22px] lg:border lg:px-4 lg:py-4 lg:transition ${
                    room.id === activeRoomId ? "bg-[#fffaf5]" : ""
                  }`}
                >
                  <button type="button" onClick={() => handleSelectRoom(room.id)} className="block w-full text-left">
                    <div className="flex items-start justify-between gap-3 lg:hidden">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffe7d1] text-[15px] font-semibold text-[#a54d00]">
                          {getAvatarInitial(room.customerName, "C")}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[18px] font-semibold leading-tight text-slate-900">
                            {room.customerName || `Customer ${room.customerId.slice(0, 8)}`}
                          </p>
                          <p className="mt-1 truncate text-[15px] text-slate-500">
                            {getMerchantRoomPreview(room)}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 pt-1 text-[13px] text-slate-400">
                        {formatInboxDate(room.lastMessageAt || room.updatedAt)}
                      </span>
                    </div>

                    <div className="hidden items-start justify-between gap-3 lg:flex">
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ffe7d1] text-sm font-semibold text-[#a54d00]">
                              {getAvatarInitial(room.customerName, "C")}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-950">{room.customerName || `Customer ${room.customerId.slice(0, 8)}`}</p>
                              <p className={`mt-2 line-clamp-2 text-xs leading-5 ${hasUnread ? "text-slate-700" : "text-slate-500"}`}>
                                {room.lastMessageSenderId === userId ? `✓ ${getMerchantRoomPreview(room)}` : getMerchantRoomPreview(room)}
                              </p>
                            </div>
                          </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              completedBooking
                                ? "bg-sky-100 text-sky-700"
                                : activeBooking
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                             }`}
                           >
                            {completedBooking ? t.completedBooking : activeBooking ? t.afterBooking : t.beforeBooking}
                          </span>
                          {hasUnread ? <span className="rounded-full bg-orange-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">{t.newBadge}</span> : null}
                        </div>
                      </div>
                      {hasUnread ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_10px_24px_rgba(244,63,94,0.28)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          {t.newBadge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                      {t.packageLabel}: {room.packageTitle || t.packageNotFound}
                    </p>
                    {room.bookingId ? (
                      <p className="mt-2 text-xs font-medium text-emerald-700">
                        {t.bookingLabel}: {room.bookingCode || room.bookingId}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {t.lastUpdated}: {formatDateTime(room.lastMessageAt || room.updatedAt)}
                    </p>
                  </button>
                  {room.packageSlug ? (
                    <Link
                      href={`/packages/${encodeURIComponent(room.packageSlug)}`}
                      className="mt-3 hidden text-xs font-semibold text-orange-600 transition hover:text-orange-700 lg:inline-flex"
                    >
                      {t.viewPackage}
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleHideRoom(room.id)}
                    disabled={hidingRoomId === room.id}
                    className="mt-3 hidden text-xs font-semibold text-slate-500 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:text-slate-300 lg:block"
                  >
                    {hidingRoomId === room.id ? t.hidingRoom : t.hideRoom}
                  </button>
                </div>
              )
            })}
            {loadingMoreRooms ? (
              <div className="px-4 py-3 text-xs text-slate-500">Memuat room berikutnya...</div>
            ) : null}
            {!loadingMoreRooms && !roomsHasMore && visibleRooms.length > 0 ? (
              <div className="px-4 py-3 text-center text-[11px] font-medium text-slate-400">
                Semua room sudah dimuat
              </div>
            ) : null}
          </div>
        </aside>

        <section className={`h-full flex-col overflow-hidden ${CHAT_DESIGN_LOCK.threadBackground} ${mobileThreadOpen ? "flex" : "hidden lg:flex"}`}>
          <div className={`border-b border-[#efe3d1] ${CHAT_DESIGN_LOCK.panelBackground} px-4 py-3 lg:px-5 lg:py-4 lg:px-6`}>
            <div className="mb-2 flex items-center gap-3 lg:hidden">
              <button
                type="button"
                onClick={handleBackToRoomList}
                className="text-xl leading-none text-[#e8650a]"
                aria-label="Kembali ke daftar chat"
              >
                ←
              </button>
              <p className="truncate text-base font-semibold text-slate-900">
                {activeRoom ? activeRoom.customerName || `Customer ${activeRoom.customerId.slice(0, 8)}` : "Chat"}
              </p>
            </div>
            <p className="truncate text-xs text-slate-500 lg:hidden">{activeRoom?.packageTitle || t.packageNotFound}</p>
            <div className="hidden flex-col gap-4 lg:flex lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{t.conversationFocus}</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  {activeRoom ? activeRoom.customerName || `Customer ${activeRoom.customerId.slice(0, 8)}` : t.selectChatRoom}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {activeRoom ? activeRoom.packageTitle || "-" : t.selectRoomToViewMerchant}
                </p>
                {activeRoom?.bookingId ? (
                  <Link
                    href={`/merchant/booking/${encodeURIComponent(activeRoom.bookingId)}`}
                    className="mt-3 inline-flex text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                  >
                    {t.viewBookingDetail}
                  </Link>
                ) : activeRoom?.packageSlug ? (
                  <Link
                    href={`/packages/${encodeURIComponent(activeRoom.packageSlug)}`}
                    className="mt-3 inline-flex text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                  >
                    {t.viewPackageDetail}
                  </Link>
                ) : null}
                {activeRoom?.bookingId ? (
                  <div className="mt-3 rounded-[20px] border border-[#f6d6b8] bg-[#fff7ef] px-4 py-3 text-xs text-slate-700">
                    <p className="font-semibold uppercase tracking-[0.18em] text-orange-600">{t.bookingLabel}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{activeRoom.bookingCode || activeRoom.bookingId}</p>
                    <p className="mt-1 text-slate-500">
                      {isCompletedChatBooking(activeRoom)
                        ? t.completedTransaction
                        : isActiveChatBooking(activeRoom)
                          ? t.activeTransaction
                          : t.leadInquiry}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-[#efe3d1] bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.threadType}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {activeRoom ? (isCompletedChatBooking(activeRoom) ? t.completedBooking : isActiveChatBooking(activeRoom) ? t.afterBooking : t.beforeBooking) : t.beforeBooking}
                  </p>
                </div>
                <div className="rounded-[20px] border border-[#efe3d1] bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.statusLabel}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {activeRoom
                        ? isCompletedChatBooking(activeRoom)
                          ? t.completedTransaction
                          : isActiveChatBooking(activeRoom)
                            ? t.activeTransaction
                            : t.leadInquiry
                        : t.leadInquiry}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            ref={threadRef}
            onScroll={handleThreadScroll}
            className={`flex-1 space-y-4 overflow-y-auto ${CHAT_DESIGN_LOCK.threadBackground} px-3 py-3 lg:px-6 lg:py-5`}
          >
            {activeRoom && activeLoadingOlder ? (
              <div className="flex justify-center">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500">
                  Memuat pesan lama...
                </span>
              </div>
            ) : null}
            {activeRoom && !activeHasMore && messages.length > 0 ? (
              <div className="flex justify-center">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500">
                  Awal percakapan
                </span>
              </div>
            ) : null}
            {messages.length === 0 ? <div className="rounded-[22px] border border-[#eadfce] bg-white px-4 py-4 text-sm leading-6 text-slate-600">{t.noMessages}</div> : null}

            {messages.map((message) => {
              const systemMessage = parseChatSystemMessage(message.message)
              if (systemMessage?.type === "package_inquiry") {
                const inquiryBadge = "Inquiry paket"
                const systemTimestamp = formatDateTime(message.created_at)

                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="w-full max-w-[88%] rounded-[22px] border border-[#eadfce] bg-white p-3 text-sm text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                      <div className="flex items-start gap-3">
                        {activeRoom?.packageCoverImage ? (
                          <Image
                            src={activeRoom.packageCoverImage}
                            alt={activeRoom.packageTitle || t.packageNotFound}
                            width={56}
                            height={56}
                            unoptimized
                            className="h-14 w-14 rounded-2xl object-cover"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#fff3e8] px-2.5 py-1 text-[10px] font-semibold text-orange-700">
                              {inquiryBadge}
                            </span>
                            {systemTimestamp ? (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                                {systemTimestamp}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 font-semibold leading-5 text-slate-950">{t.packageInquiryCard}</p>
                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{activeRoom?.packageTitle || t.packageNotFound}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {activeRoom?.packageSlug ? (
                              <Link
                                href={`/packages/${encodeURIComponent(activeRoom.packageSlug)}`}
                                className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-semibold text-orange-700 transition hover:bg-orange-100"
                              >
                                {t.viewPackageDetail}
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              if (systemMessage?.type === "booking_linked") {
                const bookingCode = systemMessage.bookingCode || activeRoom?.bookingCode || systemMessage.bookingId
                const bookingStatusText =
                  isCompletedChatBooking(activeRoom || {})
                    ? t.completedTransaction
                    : isActiveChatBooking(activeRoom || {})
                      ? t.activeTransaction
                      : t.leadInquiry
                const bookingBadge = "Pesanan terhubung"
                const paymentBadgeLabel = getPaymentBadgeLabel(activeRoom?.paymentStatus)
                const systemTimestamp = formatDateTime(message.created_at)

                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="w-full max-w-[88%] rounded-[22px] border border-[#f4d6b8] bg-[linear-gradient(180deg,#fff9f2_0%,#ffffff_100%)] p-3 text-sm text-slate-700 shadow-[0_12px_28px_rgba(249,115,22,0.12)]">
                      <div className="flex items-start gap-3">
                        {activeRoom?.packageCoverImage ? (
                          <Image
                            src={activeRoom.packageCoverImage}
                            alt={activeRoom.packageTitle || t.packageNotFound}
                            width={56}
                            height={56}
                            unoptimized
                            className="h-14 w-14 rounded-2xl object-cover"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#fff1e6] px-2.5 py-1 text-[10px] font-semibold text-orange-700">
                              {bookingBadge}
                            </span>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                              {paymentBadgeLabel}
                            </span>
                            {systemTimestamp ? (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                                {systemTimestamp}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 font-semibold leading-5 text-slate-950">{t.bookingCreatedCard}</p>
                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{activeRoom?.packageTitle || t.packageNotFound}</p>
                        </div>
                      </div>
                      <div className="mt-3 rounded-[18px] border border-[#f3e1cf] bg-white px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-600">{t.bookingLabel}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{bookingCode}</p>
                        <p className="mt-1 text-xs text-slate-500">{bookingStatusText}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {activeRoom?.packageSlug ? (
                          <Link
                            href={`/packages/${encodeURIComponent(activeRoom.packageSlug)}`}
                            className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-semibold text-orange-700 transition hover:bg-orange-100"
                          >
                            {t.viewPackageDetail}
                          </Link>
                        ) : null}
                        <Link
                          href={`/merchant/booking/${encodeURIComponent(systemMessage.bookingId)}`}
                          className="inline-flex rounded-full border border-[#eadfce] bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-[#fffaf5]"
                        >
                          {t.viewBookingDetail}
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              }

                const mine = message.sender_id === userId
                const receipt = mine ? getReadReceipt(message.created_at, activeRoom?.customerLastReadAt || null) : ""
                const receiptClass = receipt === "✓✓" ? "text-sky-600" : "text-slate-500"
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[82%] rounded-[16px] px-4 py-3 text-sm shadow-sm ${
                      mine ? CHAT_DESIGN_LOCK.ownBubble : CHAT_DESIGN_LOCK.peerBubble
                    }`}
                  >
                    {message.message ? <p className="whitespace-pre-line leading-7">{message.message}</p> : null}
                    {message.attachment_url ? (
                      <div className={message.message ? "mt-3" : ""}>
                        {isImageAttachment(message.attachment_mime_type) ? (
                          <a
                            href={message.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block overflow-hidden rounded-[18px] border border-white/20 bg-white/10"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={message.attachment_url}
                              alt={message.attachment_name || t.attachmentLabel}
                              className="max-h-64 w-full object-cover"
                            />
                          </a>
                        ) : (
                          <a
                            href={message.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className={`inline-flex items-center rounded-[16px] border px-3 py-2 text-xs font-semibold transition ${
                              mine
                                ? "border-[#ffcfa9] bg-[#fff2e7] text-[#9a3412] hover:bg-[#ffe4cf]"
                                : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                            }`}
                          >
                            {message.attachment_name || t.attachmentLabel}
                          </a>
                        )}
                      </div>
                    ) : null}
                    <p className="mt-2 text-right text-[11px] text-slate-400">
                      {formatDateTime(message.created_at)}
                      {mine ? <span className={`ml-1 font-semibold ${receiptClass}`}>{receipt}</span> : null}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <form onSubmit={handleSendMessage} className={`border-t border-[#efe3d1] ${CHAT_DESIGN_LOCK.panelBackground} px-3 py-2 lg:px-6 lg:py-4`}>
            {errorMessage ? <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 lg:mb-3 lg:rounded-[18px] lg:px-4 lg:py-3 lg:text-sm">{errorMessage}</div> : null}
            <div className="mb-2 lg:mb-3">
              <label className="flex flex-col gap-2 text-xs font-medium text-slate-500">
                <span className="hidden lg:block">{t.attachmentLabel}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  name="attachment"
                  disabled={!activeRoomId}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="block w-full rounded-[12px] border border-[#e6d8c2] bg-white px-3 py-2 text-xs text-slate-600 file:mr-2 file:rounded-full file:border-0 file:bg-orange-100 file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-orange-700 lg:rounded-[18px] lg:bg-[#fffdf9] lg:px-4 lg:py-3 lg:text-sm lg:file:mr-3 lg:file:px-3 lg:file:py-1.5 lg:file:text-xs"
                />
              </label>
              <p className="mt-2 hidden text-xs text-slate-400 lg:block">{t.attachmentHint}</p>
            </div>
            <div className="flex gap-2 lg:gap-3">
              <textarea
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                onKeyDown={handleDraftKeyDown}
                disabled={!activeRoomId}
                placeholder={t.replyPlaceholder}
                className="h-11 max-h-24 min-h-11 flex-1 rounded-[12px] border border-[#dcd2c3] bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 lg:h-12 lg:max-h-28 lg:min-h-12 lg:rounded-[14px] lg:px-4 lg:py-3"
              />
              <button
                type="submit"
                disabled={submitting || !activeRoomId}
                className="self-end rounded-full bg-[#ff6a00] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ea6100] disabled:cursor-not-allowed disabled:bg-slate-300 lg:rounded-[14px] lg:px-6 lg:py-3"
              >
                {submitting ? "..." : t.sendButton}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  )
}
