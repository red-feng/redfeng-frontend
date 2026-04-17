"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { INTERNAL_CHAT_ENGINE } from "@/lib/chat-engines"
import { createClient } from "@/lib/supabase/client"
import { isInternalChatImageAttachment } from "@/lib/internal-chat/attachments"
import type { InternalChatMessageItem, InternalChatRoomItem, InternalChatUserOption } from "@/lib/internal-chat/index"

type RealtimeStatus = "connecting" | "live" | "fallback"

type RoomMetaResponse = {
  room?: InternalChatRoomItem
}

type EnsureDmResponse = {
  roomId?: string
  room?: InternalChatRoomItem
  error?: string
}

type SendMessageResponse = {
  roomId?: string
  message?: InternalChatMessageItem
  error?: string
}

type SnapshotResponse = {
  rooms?: InternalChatRoomItem[]
  messages?: InternalChatMessageItem[]
  hasMore?: boolean
  oldestCreatedAt?: string | null
}

type MessagesPageResponse = {
  messages?: InternalChatMessageItem[]
  hasMore?: boolean
  oldestCreatedAt?: string | null
  error?: string
}

type Props = {
  userId: string
  initialRooms: InternalChatRoomItem[]
  initialMessages: InternalChatMessageItem[]
  initialHasMore: boolean
  initialOldestCreatedAt: string | null
  initialActiveRoomId: string
  availableUsers: InternalChatUserOption[]
}

function sortRooms(rooms: InternalChatRoomItem[]) {
  return [...rooms].sort((left, right) => {
    const leftDate = left.lastMessageAt || left.updatedAt || ""
    const rightDate = right.lastMessageAt || right.updatedAt || ""
    return rightDate.localeCompare(leftDate)
  })
}

function sortMessages(messages: InternalChatMessageItem[]) {
  return [...messages].sort((left, right) => {
    const leftDate = left.created_at || ""
    const rightDate = right.created_at || ""
    if (leftDate === rightDate) return left.id.localeCompare(right.id)
    return leftDate.localeCompare(rightDate)
  })
}

function mergeMessages(
  existingMessages: InternalChatMessageItem[],
  snapshotMessages: InternalChatMessageItem[],
) {
  const mergedMap = new Map<string, InternalChatMessageItem>()
  for (const message of existingMessages) {
    mergedMap.set(message.id, message)
  }
  for (const message of snapshotMessages) {
    mergedMap.set(message.id, message)
  }
  return sortMessages([...mergedMap.values()])
}

function formatDateTime(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function InternalChatRealtimeClient({
  userId,
  initialRooms,
  initialMessages,
  initialHasMore,
  initialOldestCreatedAt,
  initialActiveRoomId,
  availableUsers,
}: Props) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const threadRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previousRoomRef = useRef("")
  const previousLastMessageIdRef = useRef("")
  const [rooms, setRooms] = useState<InternalChatRoomItem[]>(() => sortRooms(initialRooms))
  const [activeRoomId, setActiveRoomId] = useState(initialActiveRoomId)
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, InternalChatMessageItem[]>>(() =>
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
  const [selectedTargetUserId, setSelectedTargetUserId] = useState(availableUsers[0]?.id || "")
  const [sending, setSending] = useState(false)
  const [creatingDm, setCreatingDm] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting")
  const [roomSearch, setRoomSearch] = useState("")

  const activeRoom = rooms.find((room) => room.id === activeRoomId) || null
  const activeMessages = messagesByRoom[activeRoomId] || []
  const activeMessagesLength = activeMessages.length
  const activeLastMessageId = activeMessages[activeMessagesLength - 1]?.id || ""
  const activeHasMore = Boolean(hasMoreByRoom[activeRoomId])
  const activeLoadingOlder = Boolean(loadingOlderByRoom[activeRoomId])

  const unreadCount = rooms.filter((room) => {
    if (!room.lastMessageSenderId || room.lastMessageSenderId === userId) return false
    if (!room.lastMessageAt) return false
    if (!room.currentUserLastReadAt) return true
    return room.lastMessageAt > room.currentUserLastReadAt
  }).length

  const directRooms = rooms.length
  const normalizedRoomSearch = roomSearch.trim().toLowerCase()
  const visibleRooms = normalizedRoomSearch
    ? rooms.filter((room) => {
        const haystack = `${room.title} ${room.subtitle || ""} ${room.lastMessagePreview || ""}`.toLowerCase()
        return haystack.includes(normalizedRoomSearch)
      })
    : rooms

  async function fetchRoomMeta(roomId: string) {
    try {
      const response = await fetch(`${INTERNAL_CHAT_ENGINE.roomMetaEndpoint}?roomId=${encodeURIComponent(roomId)}`, { cache: "no-store" })
      if (!response.ok) return null
      const payload = (await response.json()) as RoomMetaResponse
      return payload.room || null
    } catch {
      return null
    }
  }

  const fetchMessagesPage = useCallback(async (roomId: string, beforeCreatedAt?: string | null) => {
    const search = new URLSearchParams({ roomId })
    if (beforeCreatedAt) {
      search.set("beforeCreatedAt", beforeCreatedAt)
    }
    const response = await fetch(`${INTERNAL_CHAT_ENGINE.messagesEndpoint}?${search.toString()}`, { cache: "no-store" })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as MessagesPageResponse | null
      throw new Error(payload?.error || "Gagal memuat pesan chat internal.")
    }
    return (await response.json()) as MessagesPageResponse
  }, [])

  const fetchLatestMessages = useCallback(async (roomId: string) => {
    try {
      const payload = await fetchMessagesPage(roomId)
      const nextMessages = sortMessages(payload.messages || [])
      setMessagesByRoom((current) => ({ ...current, [roomId]: nextMessages }))
      setLoadedRoomIds((current) => ({ ...current, [roomId]: true }))
      setHasMoreByRoom((current) => ({ ...current, [roomId]: Boolean(payload.hasMore) }))
      setOldestByRoom((current) => ({
        ...current,
        [roomId]: payload.oldestCreatedAt || nextMessages[0]?.created_at || null,
      }))
    } catch {}
  }, [fetchMessagesPage])

  const loadOlderMessages = useCallback(async (roomId: string) => {
    if (!roomId) return
    if (loadingOlderByRoom[roomId]) return
    if (!hasMoreByRoom[roomId]) return

    const beforeCreatedAt = oldestByRoom[roomId]
    if (!beforeCreatedAt) return

    const container = threadRef.current
    const previousHeight = container?.scrollHeight || 0
    const previousTop = container?.scrollTop || 0

    setLoadingOlderByRoom((current) => ({ ...current, [roomId]: true }))
    try {
      const payload = await fetchMessagesPage(roomId, beforeCreatedAt)
      const olderMessages = sortMessages(payload.messages || [])
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

      setHasMoreByRoom((current) => ({ ...current, [roomId]: Boolean(payload.hasMore) }))
      setOldestByRoom((current) => ({
        ...current,
        [roomId]:
          payload.oldestCreatedAt ||
          olderMessages[0]?.created_at ||
          current[roomId] ||
          null,
      }))
    } catch {
      setHasMoreByRoom((current) => ({ ...current, [roomId]: false }))
    } finally {
      setLoadingOlderByRoom((current) => ({ ...current, [roomId]: false }))
    }
  }, [fetchMessagesPage, hasMoreByRoom, loadingOlderByRoom, oldestByRoom])

  const markRoomRead = useCallback(async (roomId: string) => {
    const nowIso = new Date().toISOString()
    const { error } = await supabase
      .from("internal_chat_room_members")
      .update({ last_read_at: nowIso })
      .eq("room_id", roomId)
      .eq("user_id", userId)
    if (!error) {
      setRooms((current) =>
        current.map((room) =>
          room.id === roomId
            ? {
                ...room,
                currentUserLastReadAt: nowIso,
          }
            : room,
        ),
      )
    }
  }, [supabase, userId])

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
    const hasNewLatestMessage =
      Boolean(activeLastMessageId) && previousLastMessageIdRef.current !== activeLastMessageId

    if (roomChanged || hasNewLatestMessage) {
      container.scrollTop = container.scrollHeight
    }

    previousRoomRef.current = activeRoomId
    previousLastMessageIdRef.current = activeLastMessageId
  }, [activeLastMessageId, activeRoomId, activeMessagesLength])

  useEffect(() => {
    const channel = supabase.channel(`${INTERNAL_CHAT_ENGINE.realtimeChannelPrefix}:${userId}`)

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: INTERNAL_CHAT_ENGINE.realtimeTables[0] },
      async (payload) => {
        const nextRoom = payload.new as { id?: string } | null
        const prevRoom = payload.old as { id?: string } | null
        const roomId = String(nextRoom?.id || prevRoom?.id || "").trim()
        if (!roomId) return

        if (payload.eventType === "DELETE") {
          setRooms((current) => current.filter((room) => room.id !== roomId))
          if (activeRoomId === roomId) setActiveRoomId("")
          return
        }

        const room = await fetchRoomMeta(roomId)
        if (!room) return
        setRooms((current) => {
          const next = current.filter((item) => item.id !== room.id)
          next.push(room)
          return sortRooms(next)
        })
      },
    )

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: INTERNAL_CHAT_ENGINE.realtimeTables[2] },
      async (payload) => {
        const message = payload.new as InternalChatMessageItem
        if (!message?.room_id) return

        setMessagesByRoom((current) => {
          const existing = current[message.room_id] || []
          if (existing.some((row) => row.id === message.id)) return current
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
  }, [activeRoomId, markRoomRead, supabase, userId])

  useEffect(() => {
    let cancelled = false

    const fetchSnapshot = async (forceRoomId?: string) => {
      try {
        const roomId = String(forceRoomId || activeRoomId || "").trim()
        const query = roomId ? `?roomId=${encodeURIComponent(roomId)}` : ""
        const response = await fetch(`${INTERNAL_CHAT_ENGINE.snapshotEndpoint}${query}`, { cache: "no-store" })
        if (!response.ok || cancelled) return

        const payload = (await response.json()) as SnapshotResponse
        const nextRooms = sortRooms(payload.rooms || [])
        if (!cancelled) {
          setRooms(nextRooms)
        }

        const resolvedActiveRoomId = roomId || nextRooms[0]?.id || ""
        if (!cancelled && !activeRoomId && resolvedActiveRoomId) {
          setActiveRoomId(resolvedActiveRoomId)
        }

        if (resolvedActiveRoomId && Array.isArray(payload.messages) && !cancelled) {
          const nextMessages = payload.messages || []
          setMessagesByRoom((current) => ({
            ...current,
            [resolvedActiveRoomId]: mergeMessages(current[resolvedActiveRoomId] || [], nextMessages),
          }))
          setLoadedRoomIds((current) => ({ ...current, [resolvedActiveRoomId]: true }))
          setHasMoreByRoom((current) => ({
            ...current,
            [resolvedActiveRoomId]: typeof payload.hasMore === "boolean"
              ? payload.hasMore
              : current[resolvedActiveRoomId] || false,
          }))
          setOldestByRoom((current) => ({
            ...current,
            [resolvedActiveRoomId]:
              payload.oldestCreatedAt ||
              current[resolvedActiveRoomId] ||
              nextMessages[0]?.created_at ||
              null,
          }))
        }
      } catch {}
    }

    void fetchSnapshot()
    const intervalId = window.setInterval(() => {
      void fetchSnapshot()
    }, 2500)

    const handleFocus = () => {
      void fetchSnapshot()
    }
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchSnapshot()
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
  }, [activeRoomId])

  async function handleCreateDirectRoom() {
    if (!selectedTargetUserId) return
    setCreatingDm(true)
    setErrorMessage("")
    try {
      const response = await fetch(INTERNAL_CHAT_ENGINE.ensureDmEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: selectedTargetUserId }),
      })
      const payload = (await response.json()) as EnsureDmResponse
      if (!response.ok || payload.error || !payload.roomId) {
        throw new Error(payload.error || "Gagal membuka chat pribadi.")
      }

      if (payload.room) {
        setRooms((current) => {
          const next = current.filter((room) => room.id !== payload.room!.id)
          next.push(payload.room!)
          return sortRooms(next)
        })
      } else {
        const room = await fetchRoomMeta(payload.roomId)
        if (room) {
          setRooms((current) => {
            const next = current.filter((item) => item.id !== room.id)
            next.push(room)
            return sortRooms(next)
          })
        }
      }

      setActiveRoomId(payload.roomId)
      await fetchLatestMessages(payload.roomId)
      await markRoomRead(payload.roomId)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal membuka chat pribadi.")
    } finally {
      setCreatingDm(false)
    }
  }

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeRoomId) return
    const attachment = fileInputRef.current?.files?.[0] || null
    if (!draftMessage.trim() && !attachment) {
      setErrorMessage("Pesan atau lampiran wajib diisi.")
      return
    }

    setSending(true)
    setErrorMessage("")
    try {
      const formData = new FormData()
      formData.set("room_id", activeRoomId)
      formData.set("message", draftMessage.trim())
      if (attachment) formData.set("attachment", attachment)

      const response = await fetch(INTERNAL_CHAT_ENGINE.sendEndpoint, {
        method: "POST",
        body: formData,
      })
      const payload = (await response.json()) as SendMessageResponse
      if (!response.ok || payload.error || !payload.message) {
        throw new Error(payload.error || "Gagal kirim chat internal.")
      }

      setMessagesByRoom((current) => {
        const existing = current[activeRoomId] || []
        if (existing.some((item) => item.id === payload.message!.id)) return current
        return { ...current, [activeRoomId]: [...existing, payload.message!] }
      })

      const updatedRoom = await fetchRoomMeta(activeRoomId)
      if (updatedRoom) {
        setRooms((current) => {
          const next = current.filter((item) => item.id !== updatedRoom.id)
          next.push(updatedRoom)
          return sortRooms(next)
        })
      }

      setDraftMessage("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal kirim chat internal.")
    } finally {
      setSending(false)
    }
  }

  function handleDraftKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    if (!activeRoom || sending || !draftMessage.trim()) return
    const form = event.currentTarget.form
    if (form) {
      form.requestSubmit()
    }
  }

  function handleThreadScroll(event: React.UIEvent<HTMLDivElement>) {
    if (!activeRoomId || !activeHasMore || activeLoadingOlder) return
    if (event.currentTarget.scrollTop > 80) return
    void loadOlderMessages(activeRoomId)
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
              <p className="text-sm font-semibold text-slate-800">Internal Chat</p>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${realtimeBadge.className}`}>{realtimeBadge.label}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Chat: {directRooms} | Unread: {unreadCount}</p>
          </div>

          <div className="border-b border-[#efe3d1] bg-white px-3 py-3">
            <div className="flex gap-2">
              <select
                value={selectedTargetUserId}
                onChange={(event) => setSelectedTargetUserId(event.target.value)}
                className="h-10 flex-1 rounded-[12px] border border-[#e1d8ca] bg-[#fffdf9] px-3 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2"
              >
                {availableUsers.length === 0 ? <option value="">Tidak ada akun lain</option> : null}
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.role})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleCreateDirectRoom()}
                disabled={!selectedTargetUserId || creatingDm}
                className="rounded-[12px] border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingDm ? "..." : "Chat"}
              </button>
            </div>
            <input
              value={roomSearch}
              onChange={(event) => setRoomSearch(event.target.value)}
              placeholder="Cari chat..."
              className="mt-2 h-10 w-full rounded-[12px] border border-[#e1d8ca] bg-[#fffdf9] px-3 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {visibleRooms.map((room) => {
              const active = room.id === activeRoomId
              const hasUnread =
                room.lastMessageSenderId &&
                room.lastMessageSenderId !== userId &&
                room.lastMessageAt &&
                (!room.currentUserLastReadAt || room.lastMessageAt > room.currentUserLastReadAt)

              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setActiveRoomId(room.id)}
                  className={`mb-1 w-full rounded-[12px] px-3 py-3 text-left transition ${
                    active ? "bg-[#fff2e8]" : "hover:bg-[#f4f5f7]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{room.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{room.lastMessagePreview || "Belum ada pesan."}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-slate-400">{formatDateTime(room.lastMessageAt || room.updatedAt)}</span>
                      {hasUnread ? <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">1+</span> : null}
                    </div>
                  </div>
                </button>
              )
            })}
            {visibleRooms.length === 0 ? (
              <div className="px-3 py-4 text-xs text-slate-500">Tidak ada chat yang cocok.</div>
            ) : null}
          </div>
        </aside>

        <section className="flex h-[78vh] min-h-[640px] min-w-0 min-h-0 flex-col bg-[#efeae2]">
          <div className="sticky top-0 z-10 border-b border-[#efe3d1] bg-[#f0f2f5] px-5 py-3">
            <p className="text-base font-semibold text-slate-900">{activeRoom?.title || "Pilih chat"}</p>
            <p className="text-xs text-slate-500">{activeRoom?.subtitle || "Chat pribadi internal"}</p>
          </div>

          <div
            ref={threadRef}
            onScroll={handleThreadScroll}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-2 bg-[#efeae2] px-4 py-4"
          >
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
            {!activeRoom ? (
              <div className="rounded-[12px] bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">Pilih chat di kiri untuk mulai.</div>
            ) : activeMessages.length === 0 ? (
              <div className="rounded-[12px] bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">Belum ada pesan di room ini.</div>
            ) : (
              activeMessages.map((message) => {
                const mine = message.sender_id === userId
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[78%] rounded-[12px] px-3 py-2 text-sm shadow-sm ${
                        mine
                          ? "border border-[#ffd7b5] bg-[#ffe8d2] text-[#7a3412]"
                          : "bg-white text-slate-700"
                      }`}
                    >
                      {message.message ? <p className="whitespace-pre-line leading-6">{message.message}</p> : null}
                      {message.attachment_url ? (
                        <div className={message.message ? "mt-3" : ""}>
                          {isInternalChatImageAttachment(message.attachment_mime_type) ? (
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
                              className={`inline-flex items-center rounded-[12px] border px-3 py-2 text-xs font-semibold transition ${
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
                      <p className="mt-1 text-right text-[10px] text-slate-400">{formatDateTime(message.created_at)}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <form onSubmit={handleSendMessage} className="sticky bottom-0 border-t border-[#efe3d1] bg-[#f0f2f5] px-4 py-3">
            <div className="mb-2">
              <input
                ref={fileInputRef}
                type="file"
                name="attachment"
                disabled={!activeRoom}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                className="block w-full rounded-[12px] border border-[#dcd2c3] bg-white px-3 py-2 text-xs text-slate-600 file:mr-2 file:rounded-full file:border-0 file:bg-orange-100 file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-orange-700 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
            <div className="flex items-end gap-2">
              <textarea
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                onKeyDown={handleDraftKeyDown}
                disabled={!activeRoom}
                placeholder="Tulis pesan internal... (Enter kirim, Shift+Enter baris baru)"
                className="h-12 max-h-28 min-h-12 flex-1 rounded-[12px] border border-[#dcd2c3] bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={!activeRoom || sending}
                className="h-12 rounded-[12px] bg-[#ff6a00] px-5 text-sm font-semibold text-white transition hover:bg-[#ea6100] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {sending ? "..." : "Kirim"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  )
}
