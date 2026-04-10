"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { type Locale } from "@/lib/i18n"
import { isImageAttachment } from "@/lib/chat/attachments"
import { isActiveChatBooking, isCompletedChatBooking } from "@/lib/chat/booking-room-status"
import { parseChatSystemMessage } from "@/lib/chat/system-messages"

type CustomerChatRoom = {
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
  paymentStatus?: string | null
  customerName: string | null
  updatedAt: string | null
  lastMessageAt: string | null
  lastMessageSenderId: string | null
  customerLastReadAt: string | null
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

type CustomerChatRealtimeClientProps = {
  locale: Locale
  userId: string
  initialRooms: CustomerChatRoom[]
  initialActiveRoomId: string
  initialMessages: CustomerChatMessage[]
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
  hideRoomLabel: string
  hidingRoomLabel: string
}

type RoomMetaResponse = {
  room?: CustomerChatRoom
}

type SendMessageResponse = {
  roomId?: string
  message?: CustomerChatMessage
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
  initialActiveRoomId,
  initialMessages,
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
  hideRoomLabel,
  hidingRoomLabel,
}: CustomerChatRealtimeClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const [rooms, setRooms] = useState<CustomerChatRoom[]>(() => sortRooms(initialRooms))
  const [activeRoomId, setActiveRoomId] = useState(initialActiveRoomId)
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, CustomerChatMessage[]>>(() =>
    initialActiveRoomId ? { [initialActiveRoomId]: initialMessages } : {},
  )
  const [draftMessage, setDraftMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [hidingRoomId, setHidingRoomId] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const threadRef = useRef<HTMLDivElement | null>(null)

  const activeRoom = rooms.find((room) => room.id === activeRoomId) || null
  const messages = messagesByRoom[activeRoomId] || []

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

  async function fetchRoomMeta(roomId: string) {
    try {
      const response = await fetch(`/api/chat/room-meta?roomId=${encodeURIComponent(roomId)}`, { cache: "no-store" })
      if (!response.ok) return null
      const payload = (await response.json()) as RoomMetaResponse
      return payload.room || null
    } catch (error) {
      console.error("Failed to fetch customer chat room meta", error)
      return null
    }
  }

  async function fetchMessages(roomId: string) {
    try {
      const { data, error } = await supabase
        .from("package_chat_messages")
        .select("id, room_id, sender_id, message, attachment_url, attachment_name, attachment_mime_type, created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Failed to fetch customer chat messages", error)
        return
      }

      const nextMessages = (data as CustomerChatMessage[] | null) || []
      setMessagesByRoom((current) => ({ ...current, [roomId]: nextMessages }))
    } catch (error) {
      console.error("Failed to fetch customer chat messages", error)
    }
  }

  async function markRoomRead(roomId: string) {
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
  }

  useEffect(() => {
    if (!activeRoomId) return
    if (!messagesByRoom[activeRoomId]) {
      void fetchMessages(activeRoomId)
    }
    void markRoomRead(activeRoomId)
  }, [activeRoomId])

  useEffect(() => {
    if (!threadRef.current) return
    threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [messages.length, activeRoomId])

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

          if (message.room_id === activeRoomId && message.sender_id !== userId) {
            void markRoomRead(message.room_id)
          }
        } catch (error) {
          console.error("Failed to process customer message realtime update", error)
        }
      },
    )

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [activeRoomId, supabase, userId])

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
    setHidingRoomId(roomId)
    try {
      const response = await fetch("/api/chat/hide-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        throw new Error(
          payload?.error || (locale === "en" ? "Failed to hide room." : locale === "zh" ? "移除会话失败。" : "Gagal menyembunyikan room."),
        )
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to hide room.")
    } finally {
      setHidingRoomId("")
    }
  }

  return (
    <>
      <section className="mt-6 grid gap-4 md:grid-cols-3">
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

      <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-4 lg:flex lg:max-h-[calc(56vh+12rem)] lg:flex-col lg:overflow-hidden">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            <div className="mt-4 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
              {rooms.length === 0 ? <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-500">{noChats}</div> : null}
              {rooms.map((room) => {
                const completedBooking = isCompletedChatBooking(room)
                const activeBooking = isActiveChatBooking(room)
                const hasUnread =
                  room.lastMessageSenderId &&
                  room.lastMessageSenderId !== userId &&
                  (!room.customerLastReadAt || (room.lastMessageAt || "") > room.customerLastReadAt)

                return (
                  <div key={room.id} className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300">
                    <button
                      type="button"
                      onClick={() => setActiveRoomId(room.id)}
                      className={`block w-full text-left ${room.id === activeRoomId ? "text-orange-700" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="line-clamp-2 font-medium">{room.packageTitle || packageFallback}</p>
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
                            {hasUnread ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">{newBadge}</span> : null}
                          </div>
                          {room.bookingId ? (
                            <p className="mt-2 text-xs font-medium text-slate-500">
                              {bookingLabel}: {room.bookingCode || room.bookingId}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{room.updatedAt || "-"}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleHideRoom(room.id)}
                      disabled={hidingRoomId === room.id}
                      className="mt-3 inline-flex text-xs font-semibold text-slate-500 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      {hidingRoomId === room.id ? hidingRoomLabel : hideRoomLabel}
                    </button>
                  </div>
                )
              })}
            </div>
          </aside>

          <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-sm text-slate-500">{packageLabel}</p>
              <p className="text-base font-semibold text-slate-900">{activeRoom?.packageTitle || packageFallback}</p>
              {activeRoom ? (
                <div className="mt-3 flex flex-wrap gap-2">
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
                  className="mt-1 inline-block text-xs text-orange-600 hover:text-orange-700"
                >
                  {viewPackageDetailLabel}
                </Link>
              ) : null}
              {activeRoom?.bookingId ? (
                <div className="mt-3 rounded-[18px] border border-orange-200 bg-orange-50 px-3 py-3 text-xs text-slate-700">
                  <p className="font-semibold text-orange-700">{bookingLabel}</p>
                  <p className="mt-1 font-medium text-slate-900">{activeRoom.bookingCode || activeRoom.bookingId}</p>
                  <p className="mt-1 text-slate-500">
                    {isCompletedChatBooking(activeRoom) ? completedStatus : isActiveChatBooking(activeRoom) ? activeStatus : leadStatus}
                  </p>
                </div>
              ) : null}
            </div>

            <div ref={threadRef} className="h-[56vh] space-y-3 overflow-y-auto bg-slate-50/50 px-5 py-4">
              {messages.length === 0 ? <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-500">{noMessages}</div> : null}
              {messages.map((message) => {
                const systemMessage = parseChatSystemMessage(message.message)
                if (systemMessage?.type === "package_inquiry") {
                  const inquiryTitle =
                    locale === "en"
                      ? "You asked about this package"
                      : locale === "zh"
                        ? "你正在咨询这个套餐"
                        : "Kamu bertanya tentang paket ini"
                  const inquiryTime = formatSystemCardTime(message.created_at, locale)

                  return (
                    <div key={message.id} className="flex justify-center">
                      <div className="max-w-[88%] rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
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
                            <p className="font-semibold text-slate-900">{inquiryTitle}</p>
                            <p className="mt-1 line-clamp-2 font-medium text-slate-700">{activeRoom?.packageTitle || packageFallback}</p>
                            {inquiryTime ? (
                              <div className="mt-2">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                                  {inquiryTime}
                                </span>
                              </div>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {activeRoom?.packageSlug ? (
                                <Link
                                  href={`/packages/${encodeURIComponent(activeRoom.packageSlug)}`}
                                  className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
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

                if (systemMessage?.type === "booking_linked") {
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
                      <div className="max-w-[88%] rounded-[18px] border border-orange-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
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
                            <p className="font-semibold text-slate-900">{bookingTitle}</p>
                            <p className="mt-1 line-clamp-2 font-medium text-slate-700">{activeRoom?.packageTitle || packageFallback}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                                {paymentBadgeLabel}
                              </span>
                              {systemTimestamp ? (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                                  {systemTimestamp}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">{bookingLabel}</p>
                        <p className="mt-1 font-medium text-slate-900">{bookingCode}</p>
                        <p className="mt-1 text-xs text-slate-500">{bookingStatusText}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {activeRoom?.packageSlug ? (
                            <Link
                              href={`/packages/${encodeURIComponent(activeRoom.packageSlug)}`}
                              className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                            >
                              {viewPackageDetailLabel}
                            </Link>
                          ) : null}
                          <Link
                            href={`/booking/${encodeURIComponent(systemMessage.bookingId)}`}
                            className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            {bookingDetailLabel}
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
                      className={`max-w-[80%] rounded-[20px] px-4 py-3 text-sm shadow-sm ${
                        mine ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"
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
                                  ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                                  : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                              }`}
                            >
                              {message.attachment_name || "Lampiran"}
                            </a>
                          )}
                        </div>
                      ) : null}
                      <p className={`mt-2 text-[11px] ${mine ? "text-slate-300" : "text-slate-400"}`}>{message.created_at || ""}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleSendMessage} className="border-t border-slate-200 bg-white p-4">
              {errorMessage ? <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}
              <div className="mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  name="attachment"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="block w-full rounded-[18px] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-orange-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-orange-700"
                />
              </div>
              <div className="flex gap-3">
                <textarea
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  placeholder={writeMessageLabel}
                  className="h-24 flex-1 rounded-[20px] border border-slate-300 p-3 text-sm outline-none ring-orange-500 focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={submitting || !activeRoomId}
                  className="self-end rounded-[20px] bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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
