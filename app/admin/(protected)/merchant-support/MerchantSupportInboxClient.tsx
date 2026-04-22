"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MERCHANT_SUPPORT_ENGINE } from "@/lib/chat-engines"
import { createClient } from "@/lib/supabase/client"

type MerchantSupportRoomItem = {
  id: string
  merchantId: string
  merchantUserId: string
  merchantLabel: string
  merchantCode: string
  merchantEmail: string | null
  status: string
  updatedAt: string | null
  lastMessageAt: string | null
  lastMessageSenderRole: "merchant" | "admin" | "system" | null
  merchantLastReadAt: string | null
  adminLastReadAt: string | null
  lastMessagePreview: string | null
}

type MerchantSupportMessage = {
  id: string
  room_id: string
  sender_user_id: string | null
  sender_role: "merchant" | "admin" | "system"
  message: string
  created_at: string | null
}

type SnapshotPayload = {
  rooms?: MerchantSupportRoomItem[]
  activeRoomId?: string
  messages?: MerchantSupportMessage[]
  hasMore?: boolean
  oldestCreatedAt?: string | null
  unreadCount?: number
  error?: string
}

type SendPayload = {
  message?: MerchantSupportMessage
  error?: string
}

type MessagesPagePayload = {
  messages?: MerchantSupportMessage[]
  hasMore?: boolean
  oldestCreatedAt?: string | null
  error?: string
}

type RealtimeStatus = "connecting" | "live" | "fallback"

function formatDateTime(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatRoomDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
  })
}

function hasUnread(room: MerchantSupportRoomItem) {
  if (room.lastMessageSenderRole !== "merchant") return false
  if (!room.lastMessageAt) return false
  if (!room.adminLastReadAt) return true
  return room.lastMessageAt > room.adminLastReadAt
}

function sortMessages(messages: MerchantSupportMessage[]) {
  return [...messages].sort((left, right) => {
    const leftDate = left.created_at || ""
    const rightDate = right.created_at || ""
    if (leftDate === rightDate) return left.id.localeCompare(right.id)
    return leftDate.localeCompare(rightDate)
  })
}

function mergeMessages(existingMessages: MerchantSupportMessage[], snapshotMessages: MerchantSupportMessage[]) {
  const mergedMap = new Map<string, MerchantSupportMessage>()
  for (const message of existingMessages) {
    mergedMap.set(message.id, message)
  }
  for (const message of snapshotMessages) {
    mergedMap.set(message.id, message)
  }
  return sortMessages([...mergedMap.values()])
}

export default function MerchantSupportInboxClient({
  portal,
  initialRooms,
  initialMessages,
  initialHasMore,
  initialOldestCreatedAt,
  initialActiveRoomId,
}: {
  portal: "admin" | "superadmin"
  initialRooms: MerchantSupportRoomItem[]
  initialMessages: MerchantSupportMessage[]
  initialHasMore: boolean
  initialOldestCreatedAt: string | null
  initialActiveRoomId: string
}) {
  const supabaseRef = useRef(createClient(portal))
  const supabase = supabaseRef.current
  const messageTopSentinelRef = useRef<HTMLDivElement | null>(null)
  const previousRoomRef = useRef("")
  const previousLastMessageIdRef = useRef("")
  const [rooms, setRooms] = useState(initialRooms)
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, MerchantSupportMessage[]>>(
    initialActiveRoomId ? { [initialActiveRoomId]: initialMessages } : {},
  )
  const [loadedRoomIds, setLoadedRoomIds] = useState<Record<string, true>>(
    initialActiveRoomId ? { [initialActiveRoomId]: true } : {},
  )
  const [hasMoreByRoom, setHasMoreByRoom] = useState<Record<string, boolean>>(
    initialActiveRoomId ? { [initialActiveRoomId]: initialHasMore } : {},
  )
  const [oldestByRoom, setOldestByRoom] = useState<Record<string, string | null>>(
    initialActiveRoomId ? { [initialActiveRoomId]: initialOldestCreatedAt } : {},
  )
  const [loadingOlderByRoom, setLoadingOlderByRoom] = useState<Record<string, boolean>>({})
  const [activeRoomId, setActiveRoomId] = useState(initialActiveRoomId)
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting")
  const threadRef = useRef<HTMLDivElement | null>(null)

  const activeRoom = useMemo(() => rooms.find((room) => room.id === activeRoomId) || null, [activeRoomId, rooms])
  const activeMessages = useMemo(() => messagesByRoom[activeRoomId] || [], [activeRoomId, messagesByRoom])
  const activeMessagesLength = activeMessages.length
  const activeLastMessageId = activeMessages[activeMessagesLength - 1]?.id || ""
  const activeHasMore = Boolean(hasMoreByRoom[activeRoomId])
  const activeLoadingOlder = Boolean(loadingOlderByRoom[activeRoomId])
  const unreadCount = useMemo(() => rooms.filter((room) => hasUnread(room)).length, [rooms])
  const merchantProfileHref = (merchantId: string) =>
    portal === "superadmin" ? `/superadmin/merchants/${encodeURIComponent(merchantId)}` : `/admin/merchants/${encodeURIComponent(merchantId)}`
  const fetchSnapshot = useMemo(
    () => async (targetRoomId?: string) => {
      const query = targetRoomId
        ? `?roomId=${encodeURIComponent(targetRoomId)}`
        : activeRoomId
          ? `?roomId=${encodeURIComponent(activeRoomId)}`
          : ""
      const response = await fetch(`${MERCHANT_SUPPORT_ENGINE.adminSnapshotEndpoint}${query}`, { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as SnapshotPayload | null
      if (!response.ok) {
        throw new Error(payload?.error || "Gagal memuat merchant support.")
      }
      return payload
    },
    [activeRoomId],
  )

  const fetchMessagesPage = useCallback(async (roomId: string, beforeCreatedAt?: string | null) => {
    const search = new URLSearchParams({ roomId })
    if (beforeCreatedAt) {
      search.set("beforeCreatedAt", beforeCreatedAt)
    }
    const response = await fetch(`${MERCHANT_SUPPORT_ENGINE.adminMessagesEndpoint}?${search.toString()}`, { cache: "no-store" })
    const payload = (await response.json().catch(() => null)) as MessagesPagePayload | null
    if (!response.ok) {
      throw new Error(payload?.error || "Gagal memuat pesan merchant support.")
    }
    return payload
  }, [])

  const fetchLatestMessages = useCallback(async (roomId: string) => {
    const payload = await fetchMessagesPage(roomId)
    const nextMessages = sortMessages(payload?.messages || [])
    setMessagesByRoom((current) => ({ ...current, [roomId]: nextMessages }))
    setLoadedRoomIds((current) => ({ ...current, [roomId]: true }))
    setHasMoreByRoom((current) => ({ ...current, [roomId]: Boolean(payload?.hasMore) }))
    setOldestByRoom((current) => ({
      ...current,
      [roomId]: payload?.oldestCreatedAt || nextMessages[0]?.created_at || null,
    }))
  }, [fetchMessagesPage])

  const loadOlderMessages = useCallback(async (roomId: string) => {
    if (!roomId || loadingOlderByRoom[roomId] || !hasMoreByRoom[roomId]) return
    const beforeCreatedAt = oldestByRoom[roomId]
    if (!beforeCreatedAt) return

    const container = threadRef.current
    const previousHeight = container?.scrollHeight || 0
    const previousTop = container?.scrollTop || 0

    setLoadingOlderByRoom((current) => ({ ...current, [roomId]: true }))
    try {
      const payload = await fetchMessagesPage(roomId, beforeCreatedAt)
      const olderMessages = sortMessages(payload?.messages || [])
      if (olderMessages.length > 0) {
        setMessagesByRoom((current) => {
          const existing = current[roomId] || []
          return {
            ...current,
            [roomId]: mergeMessages(olderMessages, existing),
          }
        })

        requestAnimationFrame(() => {
          const nextContainer = threadRef.current
          if (!nextContainer) return
          const nextHeight = nextContainer.scrollHeight
          nextContainer.scrollTop = Math.max(0, nextHeight - previousHeight + previousTop)
        })
      }

      setHasMoreByRoom((current) => ({ ...current, [roomId]: Boolean(payload?.hasMore) }))
      setOldestByRoom((current) => ({
        ...current,
        [roomId]: payload?.oldestCreatedAt || olderMessages[0]?.created_at || current[roomId] || null,
      }))
    } catch {
      setHasMoreByRoom((current) => ({ ...current, [roomId]: false }))
    } finally {
      setLoadingOlderByRoom((current) => ({ ...current, [roomId]: false }))
    }
  }, [fetchMessagesPage, hasMoreByRoom, loadingOlderByRoom, oldestByRoom])

  useEffect(() => {
    const container = threadRef.current
    if (!container) return

    const roomChanged = previousRoomRef.current !== activeRoomId
    const hasNewLatestMessage =
      Boolean(activeLastMessageId) && previousLastMessageIdRef.current !== activeLastMessageId

    if (roomChanged || hasNewLatestMessage) {
      container.scrollTop = container.scrollHeight
    }

    previousRoomRef.current = activeRoomId
    previousLastMessageIdRef.current = activeLastMessageId
  }, [activeLastMessageId, activeMessagesLength, activeRoomId])

  useEffect(() => {
    const viewport = threadRef.current
    const sentinel = messageTopSentinelRef.current
    if (!viewport || !sentinel || !activeRoomId || !activeHasMore || activeLoadingOlder) return

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0]
        if (!firstEntry?.isIntersecting) return
        void loadOlderMessages(activeRoomId)
      },
      {
        root: viewport,
        rootMargin: "140px 0px 0px 0px",
        threshold: 0.01,
      },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [activeHasMore, activeLoadingOlder, activeMessagesLength, activeRoomId, loadOlderMessages])

  useEffect(() => {
    let cancelled = false

    async function loadSnapshot(targetRoomId?: string) {
      try {
        setLoading(true)
        const payload = await fetchSnapshot(targetRoomId)
        if (cancelled) return
        const nextRooms = payload?.rooms || []
        const nextActiveRoomId = String(payload?.activeRoomId || targetRoomId || activeRoomId || nextRooms[0]?.id || "")
        setRooms(nextRooms)
        setActiveRoomId(nextActiveRoomId)
        if (nextActiveRoomId) {
          setMessagesByRoom((current) => ({
            ...current,
            [nextActiveRoomId]: mergeMessages(current[nextActiveRoomId] || [], payload?.messages || []),
          }))
          setLoadedRoomIds((current) => ({ ...current, [nextActiveRoomId]: true }))
          setHasMoreByRoom((current) => ({
            ...current,
            [nextActiveRoomId]: typeof payload?.hasMore === "boolean" ? payload.hasMore : current[nextActiveRoomId] || false,
          }))
          setOldestByRoom((current) => ({
            ...current,
            [nextActiveRoomId]:
              payload?.oldestCreatedAt ||
              current[nextActiveRoomId] ||
              payload?.messages?.[0]?.created_at ||
              null,
          }))
        }
        setErrorMessage("")
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : "Gagal memuat merchant support.")
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadSnapshot()
    let intervalId: number | null = null
    if (realtimeStatus === "fallback") {
      intervalId = window.setInterval(() => {
        void loadSnapshot()
      }, 5000)
    }

    return () => {
      cancelled = true
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [activeRoomId, fetchSnapshot, realtimeStatus])

  useEffect(() => {
    const channel = supabase.channel(MERCHANT_SUPPORT_ENGINE.adminRealtimeChannel)

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: MERCHANT_SUPPORT_ENGINE.realtimeTables[1] },
      async () => {
        try {
          const payload = await fetchSnapshot()
          const nextRooms = payload?.rooms || []
          const nextActiveRoomId = String(payload?.activeRoomId || activeRoomId || nextRooms[0]?.id || "")
          setRooms(nextRooms)
          if (nextActiveRoomId) {
            setActiveRoomId(nextActiveRoomId)
            setMessagesByRoom((current) => ({
              ...current,
              [nextActiveRoomId]: mergeMessages(current[nextActiveRoomId] || [], payload?.messages || []),
            }))
            setLoadedRoomIds((current) => ({ ...current, [nextActiveRoomId]: true }))
            setHasMoreByRoom((current) => ({
              ...current,
              [nextActiveRoomId]: typeof payload?.hasMore === "boolean" ? payload.hasMore : current[nextActiveRoomId] || false,
            }))
            setOldestByRoom((current) => ({
              ...current,
              [nextActiveRoomId]:
                payload?.oldestCreatedAt ||
                current[nextActiveRoomId] ||
                payload?.messages?.[0]?.created_at ||
                null,
            }))
          }
          setErrorMessage("")
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Gagal memuat merchant support.")
        }
      },
    )

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: MERCHANT_SUPPORT_ENGINE.realtimeTables[0] },
      async () => {
        try {
          const payload = await fetchSnapshot()
          const nextRooms = payload?.rooms || []
          const nextActiveRoomId = String(payload?.activeRoomId || activeRoomId || nextRooms[0]?.id || "")
          setRooms(nextRooms)
          if (nextActiveRoomId) {
            setActiveRoomId(nextActiveRoomId)
            setMessagesByRoom((current) => ({
              ...current,
              [nextActiveRoomId]: mergeMessages(current[nextActiveRoomId] || [], payload?.messages || []),
            }))
            setLoadedRoomIds((current) => ({ ...current, [nextActiveRoomId]: true }))
            setHasMoreByRoom((current) => ({
              ...current,
              [nextActiveRoomId]: typeof payload?.hasMore === "boolean" ? payload.hasMore : current[nextActiveRoomId] || false,
            }))
            setOldestByRoom((current) => ({
              ...current,
              [nextActiveRoomId]:
                payload?.oldestCreatedAt ||
                current[nextActiveRoomId] ||
                payload?.messages?.[0]?.created_at ||
                null,
            }))
          }
          setErrorMessage("")
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Gagal memuat merchant support.")
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
      void supabase.removeChannel(channel)
    }
  }, [activeRoomId, fetchSnapshot, supabase])

  async function selectRoom(roomId: string) {
    setActiveRoomId(roomId)
    try {
      setLoading(true)
      if (!loadedRoomIds[roomId]) {
        await fetchLatestMessages(roomId)
      }
      const payload = await fetchSnapshot(roomId)
      setRooms(payload?.rooms || [])
      setMessagesByRoom((current) => ({
        ...current,
        [roomId]: mergeMessages(current[roomId] || [], payload?.messages || []),
      }))
      setLoadedRoomIds((current) => ({ ...current, [roomId]: true }))
      setHasMoreByRoom((current) => ({
        ...current,
        [roomId]: typeof payload?.hasMore === "boolean" ? payload.hasMore : current[roomId] || false,
      }))
      setOldestByRoom((current) => ({
        ...current,
        [roomId]:
          payload?.oldestCreatedAt ||
          current[roomId] ||
          payload?.messages?.[0]?.created_at ||
          null,
      }))
      setErrorMessage("")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal membuka room merchant support.")
    } finally {
      setLoading(false)
    }
  }

  async function sendReply() {
    const message = draft.trim()
    if (!message || !activeRoomId || sending) return

    try {
      setSending(true)
      setErrorMessage("")
      const response = await fetch(MERCHANT_SUPPORT_ENGINE.adminSendEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomId: activeRoomId, message }),
      })
      const payload = (await response.json().catch(() => null)) as SendPayload | null
      if (!response.ok || !payload?.message) {
        throw new Error(payload?.error || "Gagal mengirim balasan admin.")
      }
      setMessagesByRoom((current) => ({
        ...current,
        [activeRoomId]: mergeMessages(current[activeRoomId] || [], [payload.message as MerchantSupportMessage]),
      }))
      setRooms((current) =>
        current.map((room) =>
          room.id === activeRoomId
            ? {
                ...room,
                lastMessageAt: (payload.message as MerchantSupportMessage).created_at,
                updatedAt: (payload.message as MerchantSupportMessage).created_at,
                lastMessageSenderRole: "admin",
                lastMessagePreview: (payload.message as MerchantSupportMessage).message,
                adminLastReadAt: (payload.message as MerchantSupportMessage).created_at,
              }
            : room,
        ),
      )
      setDraft("")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal mengirim balasan admin.")
    } finally {
      setSending(false)
    }
  }

  const realtimeBadge =
    realtimeStatus === "live"
      ? { label: "Live", className: "border-emerald-200 bg-emerald-50 text-emerald-700" }
      : realtimeStatus === "fallback"
        ? { label: "Fallback", className: "border-orange-200 bg-orange-50 text-orange-700" }
        : { label: "Menghubungkan", className: "border-amber-200 bg-amber-50 text-amber-700" }

  return (
    <section className="mt-8 overflow-hidden rounded-[30px] border border-[#e9dccb] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      {errorMessage ? (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}
      <div className="grid h-[78vh] min-h-[640px] gap-0 lg:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="flex h-[78vh] min-h-[640px] min-w-0 min-h-0 flex-col border-r border-[#efe3d1] bg-[#f8f9fa]">
          <div className="border-b border-[#efe3d1] bg-[#f0f2f5] px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Merchant Support</p>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${realtimeBadge.className}`}>{realtimeBadge.label}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Room: {rooms.length} | Unread: {unreadCount}</p>
          </div>

          <div className="border-b border-[#efe3d1] bg-white px-3 py-3">
            <div className="rounded-[12px] border border-[#e1d8ca] bg-[#fffdf9] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">Merchant support desk</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Semua kendala merchant terkait verifikasi, paket, booking, dan payout terkumpul di inbox ini.
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {rooms.length === 0 ? (
              <div className="px-3 py-4 text-xs text-slate-500">Belum ada room bantuan merchant.</div>
            ) : (
              rooms.map((room) => {
                const active = room.id === activeRoomId
                const unread = hasUnread(room)

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => void selectRoom(room.id)}
                    className={`mb-1 w-full rounded-[12px] px-3 py-3 text-left transition ${
                      active ? "bg-[#fff2e8]" : "hover:bg-[#f4f5f7]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{room.merchantLabel}</p>
                        <p className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-600">{room.merchantCode}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{room.lastMessagePreview || "Belum ada pesan."}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-slate-400">{formatRoomDate(room.lastMessageAt || room.updatedAt)}</span>
                        {unread ? <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">1+</span> : null}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <section className="flex h-[78vh] min-h-[640px] min-w-0 min-h-0 flex-col bg-[#efeae2]">
          <div className="sticky top-0 z-10 border-b border-[#efe3d1] bg-[#f0f2f5] px-5 py-3">
            {activeRoom ? (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-900">{activeRoom.merchantLabel}</p>
                  <p className="text-xs text-slate-500">{activeRoom.merchantCode} • {activeRoom.merchantEmail || "Email merchant belum tersedia"}</p>
                </div>
                <Link
                  href={merchantProfileHref(activeRoom.merchantId)}
                  className="inline-flex self-start rounded-full border border-[#e1d8ca] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
                >
                  Buka profil merchant
                </Link>
              </div>
            ) : (
              <>
                <p className="text-base font-semibold text-slate-900">Pilih chat</p>
                <p className="text-xs text-slate-500">Inbox bantuan merchant</p>
              </>
            )}
          </div>

          <div
            ref={threadRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-2 bg-[#efeae2] px-4 py-4"
          >
            <div ref={messageTopSentinelRef} aria-hidden="true" className="h-1 w-full" />
            {activeRoom && activeHasMore && !activeLoadingOlder ? (
              <div className="mb-2 flex justify-center">
                <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] text-orange-600">
                  Geser ke atas, pesan lama akan dimuat otomatis...
                </span>
              </div>
            ) : null}
            {activeRoom && activeLoadingOlder ? (
              <div className="mb-2 flex justify-center">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500">
                  Memuat pesan lama...
                </span>
              </div>
            ) : null}
            {activeRoom && !activeHasMore && activeMessages.length > 0 ? (
              <div className="mb-2 flex justify-center">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500">
                  Awal percakapan
                </span>
              </div>
            ) : null}
            {loading && activeMessages.length === 0 ? (
              <div className="rounded-[12px] bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">Memuat percakapan merchant support...</div>
            ) : null}
            {!loading && !activeRoom ? (
              <div className="rounded-[12px] bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">Pilih room di kiri untuk mulai.</div>
            ) : null}
            {activeRoom && activeMessages.length === 0 ? (
              <div className="rounded-[12px] bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">Belum ada pesan di room ini.</div>
            ) : null}

            {activeMessages.map((message) => {
              if (message.sender_role === "system") {
                return (
                  <div key={message.id} className="flex justify-center">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500">
                      {message.message}
                    </span>
                  </div>
                )
              }

              const mine = message.sender_role === "admin"
              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-[12px] px-3 py-2 text-sm shadow-sm ${
                      mine
                        ? "border border-[#ffd7b5] bg-[#ffe8d2] text-[#7a3412]"
                        : "bg-white text-slate-700"
                    }`}
                  >
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${mine ? "text-[#9a3412]" : "text-slate-500"}`}>
                      {mine ? "Admin Red Feng" : activeRoom?.merchantLabel || "Merchant"}
                    </p>
                    <p className="mt-1 whitespace-pre-line leading-6">{message.message}</p>
                    <p className="mt-1 text-right text-[10px] text-slate-400">{formatDateTime(message.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="sticky bottom-0 border-t border-[#efe3d1] bg-[#f0f2f5] px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={!activeRoomId}
                placeholder={activeRoomId ? "Tulis balasan untuk merchant..." : "Pilih room bantuan lebih dulu"}
                className="h-12 max-h-28 min-h-12 flex-1 rounded-[12px] border border-[#dcd2c3] bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <button
                type="button"
                onClick={() => void sendReply()}
                disabled={!activeRoomId || !draft.trim() || sending}
                className="h-12 rounded-[12px] bg-[#ff6a00] px-5 text-sm font-semibold text-white transition hover:bg-[#ea6100] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {sending ? "..." : "Kirim"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}
