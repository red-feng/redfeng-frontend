"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { isImageAttachment } from "@/lib/chat/attachments"
import { shouldMarkRoomReadOnActivation } from "@/lib/chat/auth-flow-policy.mjs"
import { isActiveChatBooking, isCompletedChatBooking } from "@/lib/chat/booking-room-status"
import { parseChatSystemMessage } from "@/lib/chat/system-messages"

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

type MerchantChatRealtimeClientProps = {
  userId: string
  initialRooms: MerchantChatRoom[]
  initialActiveRoomId: string
  initialSelectionWasExplicit: boolean
  initialMessages: MerchantChatMessage[]
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

export default function MerchantChatRealtimeClient({
  userId,
  initialRooms,
  initialActiveRoomId,
  initialSelectionWasExplicit,
  initialMessages,
  text: t,
}: MerchantChatRealtimeClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const [rooms, setRooms] = useState<MerchantChatRoom[]>(() => sortRooms(initialRooms))
  const [activeRoomId, setActiveRoomId] = useState(initialActiveRoomId)
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, MerchantChatMessage[]>>(() =>
    initialActiveRoomId ? { [initialActiveRoomId]: initialMessages } : {},
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "booking">("all")
  const [draftMessage, setDraftMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [hidingRoomId, setHidingRoomId] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting")
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const threadRef = useRef<HTMLDivElement | null>(null)
  const shouldAutoMarkActiveRoomReadRef = useRef(initialSelectionWasExplicit)

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

  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from("package_chat_messages")
        .select("id, room_id, sender_id, message, attachment_url, attachment_name, attachment_mime_type, created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Failed to fetch merchant chat messages", error)
        return
      }

      setMessagesByRoom((current) => ({ ...current, [roomId]: (data as MerchantChatMessage[] | null) || [] }))
    } catch (error) {
      console.error("Failed to fetch merchant chat messages", error)
    }
  }, [supabase])

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
    void fetchMessages(activeRoomId)
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
  }, [activeRoomId, fetchMessages, initialSelectionWasExplicit, markRoomRead])

  useEffect(() => {
    if (!threadRef.current) return
    threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [messages.length, activeRoomId])

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
    void markRoomRead(roomId)
  }

  return (
    <section className="mt-8 rounded-[32px] border border-[#f3dbc3] bg-white/80 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-[#f3dbc3] bg-[#fffaf3] p-4 lg:flex lg:max-h-[calc(56vh+14rem)] lg:flex-col lg:overflow-hidden">
          <div className="flex items-center justify-between gap-3">
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

          <div className="mt-4 flex flex-wrap gap-2">
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

          <div className="mt-4 flex gap-2">
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
            <p className="mt-3 text-xs font-medium text-slate-500">
              {t.searchResultLabel}: <span className="text-slate-700">&quot;{searchQuery}&quot;</span>
            </p>
          ) : null}

          <div className="mt-4 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
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
                  className={`rounded-[22px] border px-4 py-4 transition ${
                    room.id === activeRoomId
                      ? "border-orange-200 bg-[linear-gradient(135deg,#fff3e8_0%,#ffffff_100%)] shadow-sm"
                      : hasUnread
                        ? "border-rose-200 bg-white shadow-[0_18px_40px_rgba(244,63,94,0.1)] hover:border-rose-300 hover:bg-[#fffdf9]"
                        : "border-[#eadfce] bg-white hover:border-orange-200 hover:bg-[#fffdf9]"
                  }`}
                >
                  <button type="button" onClick={() => handleSelectRoom(room.id)} className="block w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          {room.packageCoverImage ? (
                            <Image
                              src={room.packageCoverImage}
                              alt={room.packageTitle || t.packageNotFound}
                              width={48}
                              height={48}
                              unoptimized
                              className="h-12 w-12 rounded-2xl object-cover"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-950">{room.customerName || `Customer ${room.customerId.slice(0, 8)}`}</p>
                            <p className={`mt-2 line-clamp-2 text-xs leading-5 ${hasUnread ? "text-slate-700" : "text-slate-500"}`}>
                              {getMerchantRoomPreview(room)}
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
                      className="mt-3 inline-flex text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                    >
                      {t.viewPackage}
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleHideRoom(room.id)}
                    disabled={hidingRoomId === room.id}
                    className="mt-3 block text-xs font-semibold text-slate-500 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    {hidingRoomId === room.id ? t.hidingRoom : t.hideRoom}
                  </button>
                </div>
              )
            })}
          </div>
        </aside>

        <section className="overflow-hidden rounded-[28px] border border-[#f3dbc3] bg-white">
          <div className="border-b border-[#efe3d1] bg-[linear-gradient(180deg,#fff9f2_0%,#fffefc_100%)] px-5 py-5 lg:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{t.conversationFocus}</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  {activeRoom ? activeRoom.customerName || `Customer ${activeRoom.customerId.slice(0, 8)}` : t.selectChatRoom}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {activeRoom ? activeRoom.packageTitle || "-" : t.selectRoomToViewMerchant}
                </p>
                {activeRoom?.packageSlug ? (
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

          <div ref={threadRef} className="h-[56vh] space-y-4 overflow-y-auto bg-[#fffaf5] px-5 py-5 lg:px-6">
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
                          href={`/booking/${encodeURIComponent(systemMessage.bookingId)}`}
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
              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[82%] rounded-[24px] px-4 py-3 text-sm shadow-sm ${
                      mine
                        ? "bg-[linear-gradient(135deg,#a33a0b_0%,#f76707_100%)] text-white"
                        : "border border-[#eadfce] bg-white text-slate-700"
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
                                ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                                : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                            }`}
                          >
                            {message.attachment_name || t.attachmentLabel}
                          </a>
                        )}
                      </div>
                    ) : null}
                    <p className={`mt-2 text-[11px] ${mine ? "text-white/70" : "text-slate-400"}`}>{formatDateTime(message.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <form onSubmit={handleSendMessage} className="border-t border-[#efe3d1] bg-white px-5 py-4 lg:px-6">
            {errorMessage ? <div className="mb-3 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}
            <div className="mb-3">
              <label className="flex flex-col gap-2 text-xs font-medium text-slate-500">
                <span>{t.attachmentLabel}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  name="attachment"
                  disabled={!activeRoomId}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="block w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-orange-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-orange-700"
                />
              </label>
              <p className="mt-2 text-xs text-slate-400">{t.attachmentHint}</p>
            </div>
            <div className="flex gap-3">
              <textarea
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                disabled={!activeRoomId}
                placeholder={t.replyPlaceholder}
                className="h-24 flex-1 rounded-[22px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={submitting || !activeRoomId}
                className="self-end rounded-[22px] bg-[linear-gradient(135deg,#a33a0b_0%,#f76707_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(194,65,12,0.22)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
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
