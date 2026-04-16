"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
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
  unreadCount?: number
  error?: string
}

type SendPayload = {
  message?: MerchantSupportMessage
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

export default function MerchantSupportInboxClient({
  initialRooms,
  initialMessages,
  initialActiveRoomId,
}: {
  initialRooms: MerchantSupportRoomItem[]
  initialMessages: MerchantSupportMessage[]
  initialActiveRoomId: string
}) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const [rooms, setRooms] = useState(initialRooms)
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, MerchantSupportMessage[]>>(
    initialActiveRoomId ? { [initialActiveRoomId]: initialMessages } : {},
  )
  const [activeRoomId, setActiveRoomId] = useState(initialActiveRoomId)
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting")
  const threadRef = useRef<HTMLDivElement | null>(null)

  const activeRoom = useMemo(() => rooms.find((room) => room.id === activeRoomId) || null, [activeRoomId, rooms])
  const activeMessages = useMemo(() => messagesByRoom[activeRoomId] || [], [activeRoomId, messagesByRoom])
  const unreadCount = useMemo(() => rooms.filter((room) => hasUnread(room)).length, [rooms])
  const fetchSnapshot = useMemo(
    () => async (targetRoomId?: string) => {
      const query = targetRoomId
        ? `?roomId=${encodeURIComponent(targetRoomId)}`
        : activeRoomId
          ? `?roomId=${encodeURIComponent(activeRoomId)}`
          : ""
      const response = await fetch(`/api/admin/merchant-support/snapshot${query}`, { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as SnapshotPayload | null
      if (!response.ok) {
        throw new Error(payload?.error || "Gagal memuat merchant support.")
      }
      return payload
    },
    [activeRoomId],
  )

  useEffect(() => {
    const container = threadRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [activeMessages, activeRoomId])

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
            [nextActiveRoomId]: payload?.messages || [],
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
    const channel = supabase.channel("admin-merchant-support-live")

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "merchant_support_messages" },
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
              [nextActiveRoomId]: payload?.messages || [],
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
      { event: "*", schema: "public", table: "merchant_support_rooms" },
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
              [nextActiveRoomId]: payload?.messages || [],
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
      const payload = await fetchSnapshot(roomId)
      setRooms(payload?.rooms || [])
      setMessagesByRoom((current) => ({
        ...current,
        [roomId]: payload?.messages || [],
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
      const response = await fetch("/api/admin/merchant-support/send", {
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
        [activeRoomId]: [...(current[activeRoomId] || []), payload.message as MerchantSupportMessage],
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

  return (
    <section className="mt-6 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-[28px] border border-[#efd9c0] bg-white shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
        <div className="border-b border-[#f1e2cf] px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Merchant support rooms</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-950">Inbox merchant</h2>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                  realtimeStatus === "live"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : realtimeStatus === "fallback"
                      ? "border-orange-200 bg-orange-50 text-orange-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {realtimeStatus === "live" ? "Live" : realtimeStatus === "fallback" ? "Fallback" : "Connecting"}
              </span>
              <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                {unreadCount} unread
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Semua pesan bantuan dari merchant terkumpul di sini untuk follow-up operasional.
          </p>
        </div>

        <div className="max-h-[720px] overflow-y-auto p-3">
          {rooms.length === 0 ? (
            <div className="rounded-[22px] border border-[#f1e2cf] bg-[#fffaf3] px-4 py-4 text-sm text-slate-600">
              Belum ada room bantuan merchant.
            </div>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => {
                const isActive = room.id === activeRoomId
                const unread = hasUnread(room)
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => void selectRoom(room.id)}
                    className={`w-full rounded-[22px] border p-4 text-left transition ${
                      isActive
                        ? "border-orange-200 bg-[#fff7ef] shadow-[0_12px_28px_rgba(249,115,22,0.10)]"
                        : "border-[#f1e2cf] bg-white hover:border-orange-200 hover:bg-[#fffaf4]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{room.merchantLabel}</p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">{room.merchantCode}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {unread ? <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-semibold text-white">new</span> : null}
                        <span className="text-[11px] text-slate-400">{formatRoomDate(room.lastMessageAt || room.updatedAt)}</span>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{room.lastMessagePreview || "Belum ada pesan."}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-[#efd9c0] bg-white shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
        <div className="border-b border-[#f1e2cf] px-5 py-5">
          {activeRoom ? (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Active merchant</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">{activeRoom.merchantLabel}</h2>
                <p className="mt-2 text-sm text-slate-500">{activeRoom.merchantCode}</p>
                <p className="mt-1 text-sm text-slate-500">{activeRoom.merchantEmail || "Email merchant belum tersedia"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/merchants/${encodeURIComponent(activeRoom.merchantId)}`}
                  className="rounded-full border border-[#ead8c0] bg-[#fffaf4] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
                >
                  Buka profil merchant
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Active merchant</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Pilih room bantuan</h2>
            </div>
          )}
        </div>

        <div ref={threadRef} className="max-h-[520px] space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#fffdf9_0%,#fff7ef_100%)] px-5 py-5">
          {loading && activeMessages.length === 0 ? (
            <p className="text-sm text-slate-500">Memuat percakapan merchant support...</p>
          ) : null}
          {!loading && !activeRoom ? <p className="text-sm text-slate-500">Belum ada room yang dipilih.</p> : null}
          {activeRoom && activeMessages.length === 0 ? <p className="text-sm text-slate-500">Belum ada pesan di room ini.</p> : null}

          {activeMessages.map((message) => {
            if (message.sender_role === "system") {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-medium text-orange-700">
                    {message.message}
                  </div>
                </div>
              )
            }

            const mine = message.sender_role === "admin"
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-[22px] px-4 py-3 shadow-sm ${
                    mine
                      ? "bg-[linear-gradient(135deg,#0f172a_0%,#334155_100%)] text-white"
                      : "border border-[#eedfcc] bg-white text-slate-700"
                  }`}
                >
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${mine ? "text-slate-200" : "text-orange-600"}`}>
                    {mine ? "Admin Red Feng" : activeRoom?.merchantLabel || "Merchant"}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6">{message.message}</p>
                  <p className={`mt-2 text-[11px] ${mine ? "text-slate-300" : "text-slate-400"}`}>{formatDateTime(message.created_at)}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-[#f1e2cf] px-5 py-5">
          {errorMessage ? (
            <div className="mb-3 rounded-[16px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!activeRoomId}
              placeholder={activeRoomId ? "Tulis balasan untuk merchant..." : "Pilih room bantuan lebih dulu"}
              className="min-h-28 w-full rounded-[18px] border border-[#e7d8c5] bg-[#fffdf9] px-4 py-3 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void sendReply()}
                disabled={!activeRoomId || !draft.trim() || sending}
                className="rounded-[18px] bg-[linear-gradient(135deg,#ea580c_0%,#f97316_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(249,115,22,0.24)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_36px_rgba(249,115,22,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Mengirim..." : "Kirim balasan"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
