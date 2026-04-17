"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { type Locale } from "@/lib/i18n"
import { isImageAttachment } from "@/lib/chat/attachments"
import { isActiveChatBooking, isCompletedChatBooking, isVisiblePaidChatBooking } from "@/lib/chat/booking-room-status"
import { parseChatSystemMessage } from "@/lib/chat/system-messages"
import { CHAT_DESIGN_LOCK } from "@/lib/chat-design-lock"

type CustomerChatRoom = {
  id: string
  packageId: string
  packageCode: string | null
  packageTitle: string | null
  packageSlug: string | null
  packageCoverImage: string | null
  merchantName: string | null
  merchantLogoUrl: string | null
  customerId: string
  merchantUserId: string
  bookingId: string | null
  bookingCode: string | null
  bookingStatus: string | null
  paymentStatus?: string | null
  customerName: string | null
  lastMessagePreview: string | null
  updatedAt: string | null
  lastMessageAt: string | null
  lastMessageSenderId: string | null
  customerLastReadAt: string | null
  merchantLastReadAt: string | null
}

function formatSystemCardTime(value: string | null, locale: Locale) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const language = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "id-ID"
  return date.toLocaleString(language, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getPaymentBadgeLabel(paymentStatus: string | null | undefined, locale: Locale) {
  const normalized = String(paymentStatus || "").trim().toLowerCase()
  if (normalized === "paid") return locale === "en" ? "Paid" : locale === "zh" ? "已付款" : "Lunas"
  if (normalized === "dp_paid") return locale === "en" ? "DP Paid" : locale === "zh" ? "已付定金" : "DP Paid"
  if (normalized === "pending" || normalized === "unpaid") {
    return locale === "en" ? "Awaiting Payment" : locale === "zh" ? "待付款" : "Menunggu pembayaran"
  }
  return locale === "en" ? "Booking Linked" : locale === "zh" ? "已关联订单" : "Booking terhubung"
}

function getCustomerRoomPreview(room: CustomerChatRoom, locale: Locale) {
  const preview = String(room.lastMessagePreview || "").trim()
  if (preview) return preview
  return locale === "en" ? "No messages yet." : locale === "zh" ? "暂时还没有消息。" : "Belum ada pesan."
}

function formatMessageTime(value: string | null, locale: Locale) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const language = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "id-ID"
  return date.toLocaleString(language, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatInboxDate(value: string | null, locale: Locale) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const now = new Date()
  const sameYear = now.getFullYear() === date.getFullYear()
  const language = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "id-ID"
  return date.toLocaleDateString(language, {
    day: "2-digit",
    month: "2-digit",
    ...(sameYear ? {} : { year: "2-digit" }),
  })
}

function getAvatarInitial(name: string | null | undefined, fallback = "M") {
  const text = String(name || "").trim()
  if (!text) return fallback
  return text.charAt(0).toUpperCase()
}

function normalizeDeleteRoomLabel(label: string) {
  const text = String(label || "").trim()
  if (!text) return "Hapus room"
  if (text === "Delete permanently") return "Delete room"
  if (text === "Deleting...") return "Deleting room..."
  if (text === "Hapus permanen") return "Hapus room"
  if (text === "Menghapus permanen...") return "Menghapus room..."
  if (text.includes("永久")) return "删除房间"
  if (text.includes("删除中")) return "删除房间中..."
  return text
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

type CustomerChatMessage = {
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

const FALLBACK_SYNC_INTERVAL_MS = 4000

type CustomerChatRealtimeClientProps = {
  locale: Locale
  userId: string
  initialRooms: CustomerChatRoom[]
  initialRoomsHasMore: boolean
  initialRoomsCursor: RoomCursor | null
  initialActiveRoomId: string
  initialMessages: CustomerChatMessage[]
  initialHasMore: boolean
  initialOldestCreatedAt: string | null
  packageLabel: string
  packageFallback: string
  noChats: string
  noMessages: string
  sendLabel: string
  writeMessageLabel: string
  viewPackageDetailLabel: string
  title: string
  allConversations: string
  totalConversations: string
  newChats: string
  unreadLabel: string
  activeRoomLabel: string
  leadBadge: string
  bookingBadge: string
  completedBadge: string
  activeStatus: string
  completedStatus: string
  leadStatus: string
  newBadge: string
  bookingLabel: string
  deleteRoomLabel: string
  deletingRoomLabel: string
}

type RoomMetaResponse = {
  room?: CustomerChatRoom
}

type SendMessageResponse = {
  roomId?: string
  message?: CustomerChatMessage
  error?: string
}

type ChatMessagesPageResponse = {
  messages?: CustomerChatMessage[]
  hasMore?: boolean
  oldestCreatedAt?: string | null
  error?: string
}
type RoomsPageResponse = {
  rooms?: CustomerChatRoom[]
  hasMore?: boolean
  nextCursor?: RoomCursor | null
  error?: string
}

function sortRooms(rooms: CustomerChatRoom[]) {
  return [...rooms].sort((left, right) => {
    const leftDate = left.lastMessageAt || left.updatedAt || ""
    const rightDate = right.lastMessageAt || right.updatedAt || ""
    return rightDate.localeCompare(leftDate)
  })
}

export default function CustomerChatRealtimeClient({
  locale,
  userId,
  initialRooms,
  initialRoomsHasMore,
  initialRoomsCursor,
  initialActiveRoomId,
  initialMessages,
  initialHasMore,
  initialOldestCreatedAt,
  packageLabel,
  packageFallback,
  noChats,
  noMessages,
  sendLabel,
  writeMessageLabel,
  viewPackageDetailLabel,
  title,
  allConversations,
  totalConversations,
  newChats,
  unreadLabel,
  activeRoomLabel,
  leadBadge,
  bookingBadge,
  completedBadge,
  activeStatus,
  completedStatus,
  leadStatus,
  newBadge,
  bookingLabel,
  deleteRoomLabel,
  deletingRoomLabel,
}: CustomerChatRealtimeClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const [rooms, setRooms] = useState<CustomerChatRoom[]>(() => sortRooms(initialRooms))
  const [activeRoomId, setActiveRoomId] = useState(initialActiveRoomId)
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, CustomerChatMessage[]>>(() =>
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
  const [draftMessage, setDraftMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deletingRoomId, setDeletingRoomId] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting")
  const [roomSearch, setRoomSearch] = useState("")
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false)
  const [roomsHasMore, setRoomsHasMore] = useState(initialRoomsHasMore)
  const [roomsCursor, setRoomsCursor] = useState<RoomCursor | null>(initialRoomsCursor)
  const [loadingMoreRooms, setLoadingMoreRooms] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const threadRef = useRef<HTMLDivElement | null>(null)
  const roomListRef = useRef<HTMLDivElement | null>(null)
  const previousRoomRef = useRef("")
  const previousLastMessageIdRef = useRef("")
  const activeRoomIdRef = useRef(initialActiveRoomId)
  const fallbackSyncInFlightRef = useRef(false)

  const activeRoom = rooms.find((room) => room.id === activeRoomId) || null
  const messages = messagesByRoom[activeRoomId] || []
  const messagesLength = messages.length
  const lastMessageId = messages[messagesLength - 1]?.id || ""
  const activeHasMore = Boolean(hasMoreByRoom[activeRoomId])
  const activeLoadingOlder = Boolean(loadingOlderByRoom[activeRoomId])

  const removeRoomLocally = useCallback((roomId: string) => {
    setRooms((current) => {
      const next = current.filter((room) => room.id !== roomId)
      if (activeRoomIdRef.current === roomId) {
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
  }, [])

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId
  }, [activeRoomId])

  const unreadCount = useMemo(
    () =>
      rooms.filter((room) => {
        if (!room.lastMessageSenderId || room.lastMessageSenderId === userId) return false
        if (!room.lastMessageAt) return false
        if (!room.customerLastReadAt) return true
        return room.lastMessageAt > room.customerLastReadAt
      }).length,
    [rooms, userId],
  )
  const normalizedRoomSearch = roomSearch.trim().toLowerCase()
  const visibleRooms = normalizedRoomSearch
    ? rooms.filter((room) => {
        const haystack = `${room.merchantName || ""} ${room.packageTitle || ""} ${getCustomerRoomPreview(room, locale)}`.toLowerCase()
        return haystack.includes(normalizedRoomSearch)
      })
    : rooms

  const fetchRoomMeta = useCallback(async (roomId: string) => {
    try {
      const response = await fetch(`/api/chat/room-meta?roomId=${encodeURIComponent(roomId)}`, { cache: "no-store" })
      if (!response.ok) return null
      const payload = (await response.json()) as RoomMetaResponse
      return payload.room || null
    } catch (error) {
      console.error("Failed to fetch customer chat room meta", error)
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
      throw new Error(payload?.error || "Failed to fetch customer chat messages.")
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
      console.error("Failed to fetch customer chat messages", error)
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
          const merged = new Map<string, CustomerChatMessage>()
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
      console.error("Failed to fetch older customer chat messages", error)
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
        .update({ customer_last_read_at: nowIso })
        .eq("id", roomId)

      if (!error) {
        setRooms((current) =>
          current.map((room) => (room.id === roomId ? { ...room, customerLastReadAt: nowIso } : room)),
        )
      }
    } catch (error) {
      console.error("Failed to mark customer room as read", error)
    }
  }, [supabase])

  const refreshRoomsSnapshot = useCallback(async () => {
    const limit = String(Math.min(Math.max(rooms.length, 30), 100))
    const search = new URLSearchParams({
      mode: "customer",
      limit,
    })
    const response = await fetch(`/api/chat/rooms?${search.toString()}`, { cache: "no-store" })
    const payload = (await response.json()) as RoomsPageResponse
    if (!response.ok) {
      throw new Error(payload.error || "Gagal menyegarkan daftar room.")
    }

    const nextRooms = payload.rooms || []
    setRooms(sortRooms(nextRooms))
    setRoomsHasMore(Boolean(payload.hasMore))
    setRoomsCursor(payload.nextCursor || null)

    if (activeRoomIdRef.current) {
      const hasActiveRoom = nextRooms.some((room) => room.id === activeRoomIdRef.current)
      if (!hasActiveRoom) {
        setActiveRoomId(nextRooms[0]?.id || "")
        if (nextRooms.length === 0) {
          setMobileThreadOpen(false)
        }
      }
    }
  }, [rooms.length])

  useEffect(() => {
    if (!activeRoomId) return
    if (!loadedRoomIds[activeRoomId]) {
      void fetchLatestMessages(activeRoomId)
    }
    void markRoomRead(activeRoomId)
  }, [activeRoomId, fetchLatestMessages, loadedRoomIds, markRoomRead])

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
    const channel = supabase.channel(`customer-chat-live:${userId}`)

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
            removeRoomLocally(payloadRoomId)
            await refreshRoomsSnapshot()
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
          console.error("Failed to process customer room realtime update", error)
        }
      },
    )

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "package_chat_messages" },
      async (payload) => {
        try {
          const message = payload.new as CustomerChatMessage
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

          if (message.room_id === activeRoomIdRef.current && message.sender_id !== userId) {
            void markRoomRead(message.room_id)
          }
        } catch (error) {
          console.error("Failed to process customer message realtime update", error)
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
  }, [fetchRoomMeta, markRoomRead, refreshRoomsSnapshot, removeRoomLocally, supabase, userId])

  const realtimeBadge =
    realtimeStatus === "live"
      ? {
          label: locale === "en" ? "Live" : locale === "zh" ? "实时连接" : "Live",
          className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        }
      : realtimeStatus === "fallback"
        ? {
            label: locale === "en" ? "Fallback Sync" : locale === "zh" ? "备用同步" : "Fallback sync",
            className: "border-orange-200 bg-orange-50 text-orange-700",
          }
        : {
            label: locale === "en" ? "Connecting" : locale === "zh" ? "连接中" : "Menghubungkan",
            className: "border-amber-200 bg-amber-50 text-amber-700",
          }

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeRoomId) return

    const attachment = fileInputRef.current?.files?.[0] || null
    if (!draftMessage.trim() && !attachment) {
      setErrorMessage(locale === "en" ? "A message or attachment is required." : locale === "zh" ? "消息或附件至少需要填写一项。" : "Pesan atau lampiran wajib diisi.")
      return
    }

    setSubmitting(true)
    setErrorMessage("")

    try {
      const formData = new FormData()
      formData.set("room_id", activeRoomId)
      formData.set("message", draftMessage)
      if (activeRoom?.packageId) formData.set("package_id", activeRoom.packageId)
      if (activeRoom?.bookingId) formData.set("booking_id", activeRoom.bookingId)
      if (attachment) formData.set("attachment", attachment)

      const response = await fetch("/api/chat/send", {
        method: "POST",
        body: formData,
      })

      const payload = (await response.json()) as SendMessageResponse
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Failed to send message.")
      }

      if (payload.roomId && payload.roomId !== activeRoomId) {
        setActiveRoomId(payload.roomId)
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to send message.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleHideRoom(roomId: string) {
    setErrorMessage("")
    setDeletingRoomId(roomId)
    try {
      const response = await fetch("/api/chat/delete-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        throw new Error(
          payload?.error || (locale === "en" ? "Failed to delete room." : locale === "zh" ? "删除房间失败。" : "Gagal menghapus room."),
        )
      }

      removeRoomLocally(roomId)
      await refreshRoomsSnapshot()
    } catch (error) {
      const nextErrorMessage =
        error instanceof Error
          ? error.message
          : locale === "en"
            ? "Failed to delete room."
            : locale === "zh"
              ? "删除房间失败。"
              : "Gagal menghapus room."
      setErrorMessage(nextErrorMessage)
      window.alert(nextErrorMessage)
    } finally {
      setDeletingRoomId("")
    }
  }

  function handleDeleteRoomClick(event: React.MouseEvent<HTMLButtonElement>, roomId: string) {
    event.preventDefault()
    event.stopPropagation()
    const confirmed = window.confirm(locale === "en" ? "Delete this room permanently?" : locale === "zh" ? "确认永久删除这个房间吗？" : "Yakin hapus room ini secara permanen?")
    if (!confirmed) return
    void handleHideRoom(roomId)
  }

  function handleRoomCardKeyDown(event: React.KeyboardEvent<HTMLDivElement>, roomId: string) {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    handleSelectRoom(roomId)
  }

  function handleSelectRoom(roomId: string) {
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
        mode: "customer",
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
        const map = new Map<string, CustomerChatRoom>()
        for (const row of current) map.set(row.id, row)
        for (const row of nextRooms) map.set(row.id, row)
        return sortRooms([...map.values()])
      })
      setRoomsHasMore(Boolean(payload.hasMore))
      setRoomsCursor(payload.nextCursor || null)
    } catch (error) {
      console.error("Failed to load more customer rooms", error)
      setRoomsHasMore(false)
    } finally {
      setLoadingMoreRooms(false)
    }
  }

  useEffect(() => {
    if (realtimeStatus !== "fallback") return

    let intervalId: number | null = null

    const runFallbackSync = async () => {
      if (fallbackSyncInFlightRef.current) return
      if (document.visibilityState === "hidden") return

      fallbackSyncInFlightRef.current = true
      try {
        await refreshRoomsSnapshot()
        if (activeRoomIdRef.current) {
          await fetchLatestMessages(activeRoomIdRef.current)
        }
      } catch (error) {
        console.error("Failed to run customer fallback sync", error)
      } finally {
        fallbackSyncInFlightRef.current = false
      }
    }

    void runFallbackSync()
    intervalId = window.setInterval(() => {
      void runFallbackSync()
    }, FALLBACK_SYNC_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return
      void runFallbackSync()
    }

    const handleFocus = () => {
      void runFallbackSync()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId)
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      fallbackSyncInFlightRef.current = false
    }
  }, [fetchLatestMessages, realtimeStatus, refreshRoomsSnapshot])

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
    <>
      <section className="mt-6 hidden gap-4 md:grid md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{allConversations}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{rooms.length}</p>
          <p className="mt-2 text-xs text-slate-500">{totalConversations}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{newChats}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{unreadCount}</p>
          <p className="mt-2 text-xs text-slate-500">{unreadLabel}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{packageLabel}</p>
          <p className="mt-2 text-xl font-bold text-slate-900">{activeRoom?.packageTitle || packageFallback}</p>
          <p className="mt-2 text-xs text-slate-500">{activeRoomLabel}</p>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-none border border-slate-200 bg-white shadow-none md:mt-8 md:rounded-[28px] md:shadow-sm">
        <div className="grid h-[100dvh] min-h-[100dvh] gap-0 md:h-[82vh] md:min-h-[620px] lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside
            className={`h-full min-h-0 flex-col border-r border-slate-200 bg-white p-0 lg:overflow-hidden lg:bg-[#f8f9fa] lg:p-4 ${
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
                  value={roomSearch}
                  onChange={(event) => setRoomSearch(event.target.value)}
                  placeholder="⌕  Cari Kontak, Penjual, & Pesan"
                  className="h-8 w-full bg-transparent text-[14px] text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="hidden items-center justify-between gap-3 lg:flex">
              <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${realtimeBadge.className}`}>
                {realtimeBadge.label}
              </span>
            </div>
            <div
              ref={roomListRef}
              onScroll={handleRoomListScroll}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-0 lg:mt-4 lg:space-y-3 lg:pr-1"
            >
              {visibleRooms.length === 0 ? <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-500">{noChats}</div> : null}
              {visibleRooms.map((room) => {
                const completedBooking = isCompletedChatBooking(room)
                const activeBooking = isActiveChatBooking(room)
                const hasUnread =
                  room.lastMessageSenderId &&
                  room.lastMessageSenderId !== userId &&
                  (!room.customerLastReadAt || (room.lastMessageAt || "") > room.customerLastReadAt)

                return (
                  <div
                    key={room.id}
                    className={`border-b border-[#ececec] bg-white px-4 py-3.5 text-sm text-slate-700 last:border-b-0 lg:rounded-[20px] lg:border lg:px-4 lg:py-3 lg:transition lg:hover:border-slate-300 ${
                      room.id === activeRoomId ? "bg-[#fffaf5]" : ""
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectRoom(room.id)}
                      onKeyDown={(event) => handleRoomCardKeyDown(event, room.id)}
                      className={`block w-full text-left ${room.id === activeRoomId ? "text-orange-700" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2 lg:hidden">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffe7d1] text-[15px] font-semibold text-[#a54d00]">
                            {getAvatarInitial(room.merchantName, "M")}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[18px] font-semibold leading-tight text-slate-900">
                              {room.merchantName || "Merchant"}
                            </p>
                            <p className="mt-1 truncate text-[15px] text-slate-500">
                              {getCustomerRoomPreview(room, locale)}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 pt-1 text-[13px] text-slate-400">
                          {formatInboxDate(room.lastMessageAt || room.updatedAt, locale)}
                        </span>
                      </div>

                      <div className="hidden items-start justify-between gap-2 lg:flex">
                        <div className="min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f3ff] text-sm font-semibold text-[#1f4a8a]">
                              {getAvatarInitial(room.merchantName, "M")}
                            </div>
                            <div className="min-w-0 flex-1">
                              {(room.merchantName || room.merchantLogoUrl) ? (
                                <div className="mb-2 flex items-center gap-2">
                                  {room.merchantLogoUrl ? (
                                    <Image
                                      src={room.merchantLogoUrl}
                                      alt={room.merchantName || "Merchant"}
                                      width={20}
                                      height={20}
                                      unoptimized
                                      className="h-5 w-5 rounded-full object-cover"
                                    />
                                  ) : null}
                                  <p className="truncate text-[11px] font-semibold text-slate-500">
                                    {room.merchantName || "Merchant"}
                                  </p>
                                </div>
                              ) : null}
                              <p className="line-clamp-2 font-medium">{room.packageTitle || packageFallback}</p>
                              <p className={`mt-2 line-clamp-2 text-xs leading-5 ${hasUnread ? "text-slate-700" : "text-slate-500"}`}>
                                {room.lastMessageSenderId === userId
                                  ? `✓ ${getCustomerRoomPreview(room, locale)}`
                                  : getCustomerRoomPreview(room, locale)}
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
                              {completedBooking ? completedBadge : activeBooking ? bookingBadge : leadBadge}
                            </span>
                             {hasUnread ? <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">{newBadge}</span> : null}
                          </div>
                          {room.bookingId ? (
                            <p className="mt-2 text-xs font-medium text-slate-500">
                              {bookingLabel}: {room.bookingCode || room.bookingId}
                            </p>
                          ) : null}
                        </div>
                        {hasUnread ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_10px_24px_rgba(244,63,94,0.28)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            {newBadge}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 hidden text-[11px] text-slate-400 lg:block">{formatMessageTime(room.lastMessageAt || room.updatedAt, locale) || "-"}</p>
                    </div>
                    <button
                      type="button"
                      onPointerDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                      }}
                      onClick={(event) => handleDeleteRoomClick(event, room.id)}
                      disabled={deletingRoomId === room.id}
                      className="relative z-20 mt-3 hidden cursor-pointer select-none pointer-events-auto text-xs font-semibold text-slate-500 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:text-slate-300 lg:inline-flex"
                    >
                      {deletingRoomId === room.id ? normalizeDeleteRoomLabel(deletingRoomLabel) : normalizeDeleteRoomLabel(deleteRoomLabel)}
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
            <div className={`border-b border-slate-200 ${CHAT_DESIGN_LOCK.panelBackground} px-4 py-3 lg:px-5 lg:py-4`}>
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
                  {activeRoom?.merchantName || "Chat"}
                </p>
              </div>
              <p className="truncate text-xs text-slate-500 lg:hidden">{activeRoom?.packageTitle || packageFallback}</p>
              <p className="hidden text-sm text-slate-500 lg:block">{packageLabel}</p>
              <p className="hidden text-base font-semibold text-slate-900 lg:block">{activeRoom?.packageTitle || packageFallback}</p>
              {activeRoom ? (
                <div className="mt-3 hidden flex-wrap gap-2 lg:flex">
                  <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        isCompletedChatBooking(activeRoom)
                          ? "bg-sky-100 text-sky-700"
                          : isActiveChatBooking(activeRoom)
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isCompletedChatBooking(activeRoom) ? completedBadge : isActiveChatBooking(activeRoom) ? bookingBadge : leadBadge}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                      {isCompletedChatBooking(activeRoom) ? completedStatus : isActiveChatBooking(activeRoom) ? activeStatus : leadStatus}
                    </span>
                </div>
              ) : null}
              {activeRoom?.packageSlug ? (
                <Link
                  href={`/packages/${encodeURIComponent(activeRoom.packageSlug)}`}
                  className="mt-1 hidden text-xs text-orange-600 hover:text-orange-700 lg:inline-block"
                >
                  {viewPackageDetailLabel}
                </Link>
              ) : null}
              {activeRoom?.bookingId ? (
                <div className="mt-3 hidden rounded-[18px] border border-orange-200 bg-orange-50 px-3 py-3 text-xs text-slate-700 lg:block">
                  <p className="font-semibold text-orange-700">{bookingLabel}</p>
                  <p className="mt-1 font-medium text-slate-900">{activeRoom.bookingCode || activeRoom.bookingId}</p>
                  <p className="mt-1 text-slate-500">
                    {isCompletedChatBooking(activeRoom) ? completedStatus : isActiveChatBooking(activeRoom) ? activeStatus : leadStatus}
                  </p>
                </div>
              ) : null}
            </div>

            <div
              ref={threadRef}
              onScroll={handleThreadScroll}
              className={`flex-1 space-y-3 overflow-y-auto ${CHAT_DESIGN_LOCK.threadBackground} px-3 py-3 lg:px-5 lg:py-4`}
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
              {messages.length === 0 ? <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-500">{noMessages}</div> : null}
              {messages.map((message) => {
                const systemMessage = parseChatSystemMessage(message.message)
                if (systemMessage?.type === "package_inquiry") {
                  const inquiryTitle =
                    locale === "en"
                      ? "You asked about this package"
                      : locale === "zh"
                        ? "你正在咨询这个套餐"
                        : "Kamu menanyakan paket ini"
                  const inquiryBadge =
                    locale === "en" ? "Product inquiry" : locale === "zh" ? "套餐咨询" : "Inquiry paket"
                  const inquiryTime = formatSystemCardTime(message.created_at, locale)

                  return (
                    <div key={message.id} className="flex justify-center">
                      <div className="w-full max-w-[88%] rounded-[22px] border border-[#e8dfd4] bg-white p-3 text-sm text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                        <div className="flex items-start gap-3">
                          {activeRoom?.packageCoverImage ? (
                            <Image
                              src={activeRoom.packageCoverImage}
                              alt={activeRoom.packageTitle || packageFallback}
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
                              {inquiryTime ? (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                                  {inquiryTime}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 font-semibold leading-5 text-slate-900">{inquiryTitle}</p>
                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{activeRoom?.packageTitle || packageFallback}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {activeRoom?.packageSlug ? (
                                <Link
                                  href={`/packages/${encodeURIComponent(activeRoom.packageSlug)}`}
                                  className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-semibold text-orange-700 transition hover:bg-orange-100"
                                >
                                  {viewPackageDetailLabel}
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }

                if (systemMessage?.type === "booking_linked" && isVisiblePaidChatBooking(activeRoom || {})) {
                  const bookingCode = systemMessage.bookingCode || activeRoom?.bookingCode || systemMessage.bookingId
                  const bookingTitle =
                    locale === "en"
                      ? "You asked about this booking"
                      : locale === "zh"
                        ? "你正在咨询这笔订单"
                        : "Kamu menanyakan pesanan ini"
                  const bookingDetailLabel =
                    locale === "en"
                      ? "View booking detail"
                      : locale === "zh"
                        ? "查看订单详情"
                        : "Lihat detail booking"
                  const bookingBadge =
                    locale === "en" ? "Order linked" : locale === "zh" ? "已关联订单" : "Pesanan terhubung"
                  const bookingStatusText =
                    isCompletedChatBooking(activeRoom || {})
                      ? completedStatus
                      : isActiveChatBooking(activeRoom || {})
                        ? activeStatus
                        : leadStatus
                  const paymentBadgeLabel = getPaymentBadgeLabel(activeRoom?.paymentStatus, locale)
                  const systemTimestamp = formatSystemCardTime(message.created_at, locale)

                  return (
                    <div key={message.id} className="flex justify-center">
                      <div className="w-full max-w-[88%] rounded-[22px] border border-[#f4d6b8] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-3 text-sm text-slate-700 shadow-[0_12px_28px_rgba(249,115,22,0.12)]">
                        <div className="flex items-start gap-3">
                          {activeRoom?.packageCoverImage ? (
                            <Image
                              src={activeRoom.packageCoverImage}
                              alt={activeRoom.packageTitle || packageFallback}
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
                            <p className="mt-2 font-semibold leading-5 text-slate-900">{bookingTitle}</p>
                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{activeRoom?.packageTitle || packageFallback}</p>
                          </div>
                        </div>
                        <div className="mt-3 rounded-[18px] border border-[#f3e1cf] bg-white px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-600">{bookingLabel}</p>
                          <p className="mt-1 font-semibold text-slate-900">{bookingCode}</p>
                          <p className="mt-1 text-xs text-slate-500">{bookingStatusText}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {activeRoom?.packageSlug ? (
                            <Link
                              href={`/packages/${encodeURIComponent(activeRoom.packageSlug)}`}
                              className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-semibold text-orange-700 transition hover:bg-orange-100"
                            >
                              {viewPackageDetailLabel}
                            </Link>
                          ) : null}
                          <Link
                            href={`/booking/${encodeURIComponent(systemMessage.bookingId)}`}
                            className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            {bookingDetailLabel}
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                }

                const mine = message.sender_id === userId
                const receipt = mine ? getReadReceipt(message.created_at, activeRoom?.merchantLastReadAt || null) : ""
                const receiptClass = receipt === "✓✓" ? "text-sky-600" : "text-slate-500"
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-[14px] px-4 py-3 text-sm shadow-sm ${
                        mine ? CHAT_DESIGN_LOCK.ownBubble : CHAT_DESIGN_LOCK.peerBubble
                      }`}
                    >
                      {message.message ? <p className="whitespace-pre-line leading-6">{message.message}</p> : null}
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
                                alt={message.attachment_name || "Lampiran"}
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
                              {message.attachment_name || "Lampiran"}
                            </a>
                          )}
                        </div>
                      ) : null}
                      <p className="mt-2 text-right text-[11px] text-slate-400">
                        {formatMessageTime(message.created_at, locale)}
                        {mine ? <span className={`ml-1 font-semibold ${receiptClass}`}>{receipt}</span> : null}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleSendMessage} className={`border-t border-slate-200 ${CHAT_DESIGN_LOCK.panelBackground} px-3 py-2 lg:p-4`}>
              {errorMessage ? <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 lg:mb-3 lg:rounded-2xl lg:px-4 lg:py-3 lg:text-sm">{errorMessage}</div> : null}
              <div className="mb-2 lg:mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  name="attachment"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="block w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 file:mr-2 file:rounded-full file:border-0 file:bg-orange-100 file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-orange-700 lg:rounded-[18px] lg:px-4 lg:py-3 lg:text-sm lg:file:mr-3 lg:file:px-3 lg:file:py-1.5 lg:file:text-xs"
                />
              </div>
              <div className="flex gap-2 lg:gap-3">
                <textarea
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  onKeyDown={handleDraftKeyDown}
                  placeholder={writeMessageLabel}
                  className="h-11 max-h-24 min-h-11 flex-1 rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-orange-500 focus:ring-2 lg:h-12 lg:max-h-28 lg:min-h-12 lg:rounded-[14px] lg:p-3"
                />
                <button
                  type="submit"
                  disabled={submitting || !activeRoomId}
                  className="self-end rounded-full bg-[#ff6a00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ea6100] disabled:cursor-not-allowed disabled:bg-slate-300 lg:rounded-[14px] lg:px-5 lg:py-3"
                >
                  {submitting ? "..." : sendLabel}
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
    </>
  )
}
