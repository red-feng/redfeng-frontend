"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { InternalChatMessageItem, InternalChatRoomItem, InternalChatUserOption } from "@/lib/internal-chat"

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
}

type Props = {
  userId: string
  initialRooms: InternalChatRoomItem[]
  initialMessages: InternalChatMessageItem[]
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
  initialActiveRoomId,
  availableUsers,
}: Props) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const threadRef = useRef<HTMLDivElement | null>(null)
  const [rooms, setRooms] = useState<InternalChatRoomItem[]>(() => sortRooms(initialRooms))
  const [activeRoomId, setActiveRoomId] = useState(initialActiveRoomId)
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, InternalChatMessageItem[]>>(() =>
    initialActiveRoomId ? { [initialActiveRoomId]: initialMessages } : {},
  )
  const [draftMessage, setDraftMessage] = useState("")
  const [selectedTargetUserId, setSelectedTargetUserId] = useState(availableUsers[0]?.id || "")
  const [sending, setSending] = useState(false)
  const [creatingDm, setCreatingDm] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting")

  const activeRoom = rooms.find((room) => room.id === activeRoomId) || null
  const activeMessages = messagesByRoom[activeRoomId] || []

  const unreadCount = rooms.filter((room) => {
    if (!room.lastMessageSenderId || room.lastMessageSenderId === userId) return false
    if (!room.lastMessageAt) return false
    if (!room.currentUserLastReadAt) return true
    return room.lastMessageAt > room.currentUserLastReadAt
  }).length

  const directRooms = rooms.length

  async function fetchRoomMeta(roomId: string) {
    try {
      const response = await fetch(`/api/internal-chat/room-meta?roomId=${encodeURIComponent(roomId)}`, { cache: "no-store" })
      if (!response.ok) return null
      const payload = (await response.json()) as RoomMetaResponse
      return payload.room || null
    } catch {
      return null
    }
  }

  const fetchMessages = useCallback(async (roomId: string) => {
    const { data, error } = await supabase
      .from("internal_chat_messages")
      .select("id, room_id, sender_id, message, created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })

    if (error) return
    setMessagesByRoom((current) => ({ ...current, [roomId]: (data as InternalChatMessageItem[] | null) || [] }))
  }, [supabase])

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
    void fetchMessages(activeRoomId)
    void markRoomRead(activeRoomId)
  }, [activeRoomId, fetchMessages, markRoomRead])

  useEffect(() => {
    if (!threadRef.current) return
    threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [activeMessages.length, activeRoomId])

  useEffect(() => {
    const channel = supabase.channel(`internal-chat-live:${userId}`)

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "internal_chat_rooms" },
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
      { event: "INSERT", schema: "public", table: "internal_chat_messages" },
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
        const response = await fetch(`/api/internal-chat/snapshot${query}`, { cache: "no-store" })
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
          setMessagesByRoom((current) => ({
            ...current,
            [resolvedActiveRoomId]: payload.messages || [],
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
      const response = await fetch("/api/internal-chat/ensure-dm", {
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
      await fetchMessages(payload.roomId)
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
    if (!draftMessage.trim()) {
      setErrorMessage("Pesan wajib diisi.")
      return
    }

    setSending(true)
    setErrorMessage("")
    try {
      const formData = new FormData()
      formData.set("room_id", activeRoomId)
      formData.set("message", draftMessage.trim())

      const response = await fetch("/api/internal-chat/send", {
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal kirim chat internal.")
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
    <section className="mt-8 rounded-[30px] border border-[#ecd9c2] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[20px] border border-[#f1dfc8] bg-[#fffaf3] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-500">Semua chat</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{rooms.length}</p>
        </div>
        <div className="rounded-[20px] border border-[#f1dfc8] bg-[#fffaf3] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-500">Belum dibaca</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{unreadCount}</p>
        </div>
        <div className="rounded-[20px] border border-[#f1dfc8] bg-[#fffaf3] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-500">Chat Pribadi</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{directRooms}</p>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-[24px] border border-[#ecd9c2] bg-[#fffaf3] p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Internal Chat</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">Japri</h2>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${realtimeBadge.className}`}>
              {realtimeBadge.label}
            </span>
          </div>

          <div className="mt-4 rounded-[18px] border border-[#ead8bf] bg-white p-3">
            <p className="text-xs font-semibold text-slate-700">Buat/Buka chat pribadi</p>
            <div className="mt-2 flex gap-2">
              <select
                value={selectedTargetUserId}
                onChange={(event) => setSelectedTargetUserId(event.target.value)}
                className="h-10 flex-1 rounded-[14px] border border-[#e8d8c2] bg-[#fffdf9] px-3 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2"
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
                className="rounded-[14px] border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingDm ? "..." : "Chat"}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            {rooms.map((room) => {
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
                  className={`w-full rounded-[18px] border px-4 py-3 text-left transition ${
                    active
                      ? "border-orange-200 bg-white shadow-[0_10px_24px_rgba(249,115,22,0.1)]"
                      : "border-[#ead8bf] bg-white hover:border-orange-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{room.title}</p>
                      {room.subtitle ? <p className="mt-1 truncate text-xs text-slate-500">{room.subtitle}</p> : null}
                    </div>
                    {hasUnread ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">Baru</span> : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-600">{room.lastMessagePreview || "Belum ada pesan."}</p>
                  <p className="mt-2 text-[11px] text-slate-400">{formatDateTime(room.lastMessageAt || room.updatedAt)}</p>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="overflow-hidden rounded-[24px] border border-[#ecd9c2] bg-white">
          <div className="border-b border-[#f0e2cf] bg-[#fffaf3] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">
              Chat Pribadi
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              {activeRoom?.title || "Pilih chat"}
            </h3>
            {activeRoom?.subtitle ? <p className="mt-2 text-sm text-slate-600">{activeRoom.subtitle}</p> : null}
          </div>

          <div ref={threadRef} className="h-[58vh] space-y-3 overflow-y-auto bg-[#fffdf9] px-5 py-5">
            {!activeRoom ? (
              <div className="rounded-[18px] border border-[#ead8bf] bg-white px-4 py-3 text-sm text-slate-600">
                Pilih chat di kiri untuk mulai chat.
              </div>
            ) : activeMessages.length === 0 ? (
              <div className="rounded-[18px] border border-[#ead8bf] bg-white px-4 py-3 text-sm text-slate-600">
                Belum ada pesan di room ini.
              </div>
            ) : (
              activeMessages.map((message) => {
                const mine = message.sender_id === userId
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[78%] rounded-[18px] px-4 py-3 text-sm ${
                        mine
                          ? "bg-[linear-gradient(135deg,#a33a0b_0%,#f76707_100%)] text-white"
                          : "border border-[#ead8bf] bg-white text-slate-700"
                      }`}
                    >
                      <p className="whitespace-pre-line leading-6">{message.message}</p>
                      <p className={`mt-2 text-[11px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                        {formatDateTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <form onSubmit={handleSendMessage} className="border-t border-[#f0e2cf] bg-white px-5 py-4">
            <div className="flex gap-3">
              <textarea
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                disabled={!activeRoom}
                placeholder="Tulis pesan internal..."
                className="h-24 flex-1 rounded-[18px] border border-[#e8d8c2] bg-[#fffdf9] px-4 py-3 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={!activeRoom || sending}
                className="self-end rounded-[18px] bg-[linear-gradient(135deg,#a33a0b_0%,#f76707_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(194,65,12,0.2)] transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
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
