"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { MERCHANT_SUPPORT_ENGINE } from "@/lib/chat-engines"
import { createClient } from "@/lib/supabase/client"

type MerchantAdminHelpWidgetProps = {
  locale: string
  merchantLabel: string
  merchantCode: string
}

type WidgetCopy = {
  launcher: string
  badge: string
  title: string
  subtitle: string
  adminName: string
  adminRole: string
  adminMessage: string
  responseLabel: string
  responseValue: string
  primaryAction: string
  secondaryAction: string
  emailAction: string
  closeLabel: string
  inputPlaceholder: string
  emptyState: string
  sending: string
  loading: string
  errorLoad: string
  merchantLabel: string
  youLabel: string
  adminReplyLabel: string
  helperNote: string
  openThread: string
  muteLabel: string
  unmuteLabel: string
}

type SupportMessage = {
  id: string
  room_id: string
  sender_user_id: string | null
  sender_role: "merchant" | "admin" | "system"
  message: string
  created_at: string | null
}

type SupportRoomPayload = {
  messages?: SupportMessage[]
  error?: string
}

type SendMessagePayload = {
  message?: SupportMessage
  error?: string
}

type RealtimeStatus = "connecting" | "live" | "fallback"

type UnreadCountPayload = {
  unreadCount?: number
  error?: string
}

const copyByLocale: Record<string, WidgetCopy> = {
  id: {
    launcher: "Bantuan admin",
    badge: "Admin Help Desk",
    title: "Butuh bantuan dari admin Red Feng?",
    subtitle: "Gunakan panel ini untuk follow-up verifikasi, paket, booking, atau payout merchant Anda.",
    adminName: "Tim Admin Red Feng",
    adminRole: "Merchant support",
    adminMessage: "Halo, kami siap bantu untuk review paket, klarifikasi operasional, dan follow-up kendala merchant.",
    responseLabel: "Estimasi respons",
    responseValue: "< 15 menit pada jam operasional",
    primaryAction: "Kirim pesan",
    secondaryAction: "Buka dashboard merchant",
    emailAction: "Email admin",
    closeLabel: "Tutup bantuan admin",
    inputPlaceholder: "Tulis pesan untuk admin...",
    emptyState: "Belum ada percakapan. Mulai dari kendala paling penting yang sedang Anda hadapi.",
    sending: "Mengirim...",
    loading: "Memuat bantuan admin...",
    errorLoad: "Gagal memuat bantuan admin.",
    merchantLabel: "Merchant",
    youLabel: "Anda",
    adminReplyLabel: "Admin Red Feng",
    helperNote: "Percakapan ini tersimpan agar follow-up merchant lebih rapi.",
    openThread: "Buka bantuan admin",
    muteLabel: "Mute",
    unmuteLabel: "Unmute",
  },
  en: {
    launcher: "Admin help",
    badge: "Admin Help Desk",
    title: "Need help from the Red Feng admin team?",
    subtitle: "Use this panel for verification follow-ups, package review, booking issues, or payout questions.",
    adminName: "Red Feng Admin Team",
    adminRole: "Merchant support",
    adminMessage: "Hello, we are ready to help with package reviews, operational clarification, and merchant issue follow-up.",
    responseLabel: "Response time",
    responseValue: "< 15 minutes during working hours",
    primaryAction: "Send message",
    secondaryAction: "Open merchant dashboard",
    emailAction: "Email admin",
    closeLabel: "Close admin help",
    inputPlaceholder: "Write a message for admin...",
    emptyState: "No conversation yet. Start with the most important issue you need help with.",
    sending: "Sending...",
    loading: "Loading admin help...",
    errorLoad: "Failed to load admin help.",
    merchantLabel: "Merchant",
    youLabel: "You",
    adminReplyLabel: "Red Feng Admin",
    helperNote: "This conversation is saved so merchant follow-up stays organized.",
    openThread: "Open admin help",
    muteLabel: "Mute",
    unmuteLabel: "Unmute",
  },
  zh: {
    launcher: "Admin help",
    badge: "Admin Help Desk",
    title: "Need help from the Red Feng admin team?",
    subtitle: "Use this panel for verification follow-ups, package review, booking issues, or payout questions.",
    adminName: "Red Feng Admin Team",
    adminRole: "Merchant support",
    adminMessage: "Hello, we are ready to help with package reviews, operational clarification, and merchant issue follow-up.",
    responseLabel: "Response time",
    responseValue: "< 15 minutes during working hours",
    primaryAction: "Send message",
    secondaryAction: "Open merchant dashboard",
    emailAction: "Email admin",
    closeLabel: "Close admin help",
    inputPlaceholder: "Write a message for admin...",
    emptyState: "No conversation yet. Start with the most important issue you need help with.",
    sending: "Sending...",
    loading: "Loading admin help...",
    errorLoad: "Failed to load admin help.",
    merchantLabel: "Merchant",
    youLabel: "You",
    adminReplyLabel: "Red Feng Admin",
    helperNote: "This conversation is saved so merchant follow-up stays organized.",
    openThread: "Open admin help",
    muteLabel: "Mute",
    unmuteLabel: "Unmute",
  },
}

const MERCHANT_SUPPORT_SOUND_PREF_KEY = "merchant-support-sound-enabled"

function buildMailtoHref(input: { merchantLabel: string; merchantCode: string }) {
  const subject = `Merchant Support - ${input.merchantLabel} (${input.merchantCode})`
  const body = [
    "Halo Admin Red Feng,",
    "",
    `Merchant: ${input.merchantLabel}`,
    `Merchant Code: ${input.merchantCode}`,
    "",
    "Topik bantuan:",
    "- ",
    "",
    "Detail kendala:",
    "- ",
  ].join("\n")

  return `mailto:admin@redfeng.co?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export default function MerchantAdminHelpWidget({
  locale,
  merchantLabel,
  merchantCode,
}: MerchantAdminHelpWidgetProps) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting")
  const [unreadCount, setUnreadCount] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const threadRef = useRef<HTMLDivElement | null>(null)
  const previousUnreadCountRef = useRef(0)
  const audioEnabledRef = useRef(false)

  const t = copyByLocale[locale] || copyByLocale.id
  const mailtoHref = useMemo(() => buildMailtoHref({ merchantLabel, merchantCode }), [merchantCode, merchantLabel])
  const hideOnChatPage = false

  const fetchRoom = useMemo(
    () => async () => {
      const response = await fetch(MERCHANT_SUPPORT_ENGINE.merchantRoomEndpoint, { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as SupportRoomPayload | null
      if (!response.ok) {
        throw new Error(payload?.error || t.errorLoad)
      }
      return payload
    },
    [t.errorLoad],
  )

  const fetchUnreadCount = useMemo(
    () => async () => {
      const response = await fetch(MERCHANT_SUPPORT_ENGINE.merchantUnreadCountEndpoint, { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as UnreadCountPayload | null
      if (!response.ok) {
        throw new Error(payload?.error || "Gagal memuat unread merchant support.")
      }
      return Number(payload?.unreadCount || 0)
    },
    [],
  )

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function loadRoom() {
      try {
        setLoading(true)
        const payload = await fetchRoom()
        if (cancelled) return
        setMessages(payload?.messages || [])
        setLoaded(true)
        setUnreadCount(0)
        setErrorMessage("")
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : t.errorLoad)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadRoom()
    let intervalId: number | null = null
    if (realtimeStatus === "fallback") {
      intervalId = window.setInterval(() => {
        void loadRoom()
      }, 5000)
    }

    return () => {
      cancelled = true
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [fetchRoom, open, realtimeStatus, t.errorLoad])

  useEffect(() => {
    if (!open) return
    const container = threadRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages, open])

  useEffect(() => {
    if (typeof window === "undefined") return
    const savedPreference = window.localStorage.getItem(MERCHANT_SUPPORT_SOUND_PREF_KEY)
    if (savedPreference === "false") {
      setSoundEnabled(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      audioEnabledRef.current = true
    }
  }, [open])

  useEffect(() => {
    const previousUnreadCount = previousUnreadCountRef.current
    if (
      unreadCount > previousUnreadCount &&
      soundEnabled &&
      audioEnabledRef.current &&
      typeof window !== "undefined" &&
      document.visibilityState === "visible"
    ) {
      try {
        const AudioContextCtor =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

        if (AudioContextCtor) {
          const audioContext = new AudioContextCtor()
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          oscillator.type = "sine"
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
          gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.02)
          gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18)
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.18)
          window.setTimeout(() => {
            void audioContext.close().catch(() => {})
          }, 260)
        }
      } catch {}
    }
    previousUnreadCountRef.current = unreadCount
  }, [soundEnabled, unreadCount])

  function toggleSoundEnabled() {
    const nextValue = !soundEnabled
    setSoundEnabled(nextValue)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MERCHANT_SUPPORT_SOUND_PREF_KEY, nextValue ? "true" : "false")
    }
    if (nextValue) {
      audioEnabledRef.current = true
    }
  }

  useEffect(() => {
    if (hideOnChatPage) return

    let cancelled = false

    async function loadUnreadCount() {
      try {
        const nextCount = await fetchUnreadCount()
        if (!cancelled) {
          setUnreadCount(nextCount)
        }
      } catch {}
    }

    void loadUnreadCount()
    return () => {
      cancelled = true
    }
  }, [fetchUnreadCount, hideOnChatPage])

  useEffect(() => {
    if (hideOnChatPage) return

    const channel = supabase.channel(`${MERCHANT_SUPPORT_ENGINE.realtimeChannelPrefix}:${merchantCode}`)

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: MERCHANT_SUPPORT_ENGINE.realtimeTables[1] },
      async () => {
        try {
          const nextUnreadCount = await fetchUnreadCount()
          setUnreadCount(nextUnreadCount)
        } catch {}

        if (!open) return

        try {
          const payload = await fetchRoom()
          setMessages(payload?.messages || [])
          setLoaded(true)
          setErrorMessage("")
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : t.errorLoad)
        }
      },
    )

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: MERCHANT_SUPPORT_ENGINE.realtimeTables[0] },
      async () => {
        try {
          const nextUnreadCount = await fetchUnreadCount()
          setUnreadCount(nextUnreadCount)
        } catch {}

        if (!open) return

        try {
          const payload = await fetchRoom()
          setMessages(payload?.messages || [])
          setLoaded(true)
          setErrorMessage("")
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : t.errorLoad)
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
  }, [fetchRoom, fetchUnreadCount, hideOnChatPage, merchantCode, open, supabase, t.errorLoad])

  if (hideOnChatPage) return null

  async function handleSendMessage() {
    const message = draft.trim()
    if (!message || sending) return

    try {
      setSending(true)
      setErrorMessage("")

      const response = await fetch(MERCHANT_SUPPORT_ENGINE.merchantSendEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      })

      const payload = (await response.json().catch(() => null)) as SendMessagePayload | null
      if (!response.ok || !payload?.message) {
        throw new Error(payload?.error || "Gagal mengirim pesan bantuan.")
      }

      setMessages((current) => [...current, payload.message as SupportMessage])
      setDraft("")
      setLoaded(true)
      setUnreadCount(0)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal mengirim pesan bantuan.")
    } finally {
      setSending(false)
    }
  }

  function formatTimeLabel(value: string | null) {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""

    const localeValue = locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "id-ID"
    return date.toLocaleString(localeValue, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-4 z-50 sm:bottom-6 sm:right-6">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {open ? (
          <section className="flex h-[min(74vh,680px)] max-h-[calc(100vh-8.75rem)] w-[min(92vw,392px)] flex-col overflow-hidden rounded-[28px] border border-orange-200/80 bg-[linear-gradient(180deg,rgba(255,250,243,0.98)_0%,rgba(255,255,255,0.98)_100%)] shadow-[0_28px_80px_rgba(146,64,14,0.22)] backdrop-blur-xl sm:max-h-[calc(100vh-9rem)]">
            <div className="relative shrink-0 overflow-hidden border-b border-orange-100 bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_56%,#fdba74_100%)] px-5 py-4 text-white">
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-50">
                      {t.badge}
                    </span>
                    <h2 className="mt-3 text-lg font-semibold tracking-tight">{t.title}</h2>
                    <p className="mt-2 text-sm leading-5 text-orange-50/90">{t.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={t.closeLabel}
                    onClick={() => setOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-semibold text-white transition hover:bg-white/20"
                  >
                    x
                  </button>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-b border-[#f3e5d2] bg-[#fffaf4]/95 px-5 py-3.5 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff0df_0%,#ffe1bf_100%)] shadow-[0_10px_24px_rgba(249,115,22,0.18)]">
                  <Image src="/redfeng-favicon.png" alt="Red Feng" width={26} height={26} className="h-6 w-6 object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{t.adminName}</p>
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
                  </div>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-orange-600">{t.adminRole}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{t.responseLabel}: {t.responseValue}</p>
                </div>
                <button
                  type="button"
                  onClick={toggleSoundEnabled}
                  className="inline-flex shrink-0 items-center rounded-full border border-orange-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 transition hover:bg-orange-50"
                >
                  {soundEnabled ? t.muteLabel : t.unmuteLabel}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden bg-[#f6f1ea]">
              <div
                ref={threadRef}
                className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_34%),linear-gradient(180deg,#f8f4ee_0%,#f2ece4_100%)] px-3 py-3 sm:px-4 sm:py-4"
              >
                <div className="w-full rounded-[22px] border border-[#e8dfd4] bg-white p-3 text-sm text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{t.merchantLabel}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{merchantLabel}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-orange-600">{merchantCode}</p>
                </div>

                <div className="flex justify-start">
                  <div className="w-full max-w-[88%] rounded-[22px] border border-[#f4d6b8] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-3 text-sm text-slate-700 shadow-[0_12px_28px_rgba(249,115,22,0.12)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">{t.adminReplyLabel}</p>
                    <p className="mt-2 whitespace-pre-line leading-6">{t.adminMessage}</p>
                  </div>
                </div>

                {loading && !loaded ? <p className="text-sm text-slate-500">{t.loading}</p> : null}
                {!loading && messages.length === 0 ? <p className="text-sm leading-6 text-slate-500">{t.emptyState}</p> : null}
                {!loading && messages.length > 0 ? (
                  <div className="flex justify-center">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500">Awal percakapan</span>
                  </div>
                ) : null}
                {messages.map((message) => {
                  if (message.sender_role === "system") {
                    return (
                      <div key={message.id} className="flex justify-center">
                        <div className="max-w-[92%] rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-xs font-medium text-slate-500 shadow-sm">
                          {message.message}
                        </div>
                      </div>
                    )
                  }

                  const mine = message.sender_role === "merchant"
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`w-full max-w-[88%] rounded-[22px] p-3 text-sm shadow-[0_12px_28px_rgba(15,23,42,0.08)] ${
                          mine
                            ? "border border-[#f4d6b8] bg-[linear-gradient(180deg,#fff9f2_0%,#ffffff_100%)] text-slate-700 shadow-[0_12px_28px_rgba(249,115,22,0.12)]"
                            : "border border-[#e8dfd4] bg-white text-slate-700"
                        }`}
                      >
                        <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${mine ? "text-orange-700" : "text-orange-600"}`}>
                          {mine ? t.youLabel : t.adminReplyLabel}
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6">{message.message}</p>
                        <p className={`mt-2 text-[11px] ${mine ? "text-orange-600/80" : "text-slate-400"}`}>
                          {formatTimeLabel(message.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="shrink-0 border-t border-[#e7ddd1] bg-[#f8f3ed]/95 px-4 py-3.5 backdrop-blur">
              <p className="mb-2 text-xs leading-5 text-slate-500">{t.helperNote}</p>
              {errorMessage ? (
                <div className="mb-3 rounded-[16px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={t.inputPlaceholder}
                  className="min-h-24 w-full rounded-[20px] border border-[#ddd3c7] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => void handleSendMessage()}
                    disabled={sending || !draft.trim()}
                    className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ea580c_0%,#f97316_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(249,115,22,0.24)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_36px_rgba(249,115,22,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? t.sending : t.primaryAction}
                  </button>
                  <a
                    href={mailtoHref}
                    className="inline-flex items-center justify-center rounded-[18px] border border-[#ead8c0] bg-[#fffaf4] px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-white hover:text-orange-600"
                  >
                    {t.emailAction}
                  </a>
                  <Link
                    href="/merchant/dashboard"
                    className="inline-flex items-center justify-center rounded-[18px] border border-[#ead8c0] bg-[#fffaf4] px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-white hover:text-orange-600"
                  >
                    {t.secondaryAction}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <button
          type="button"
          aria-label={t.launcher}
          onClick={() => {
            audioEnabledRef.current = true
            setOpen((current) => !current)
          }}
          className="group flex items-center gap-3 rounded-full border border-orange-200/80 bg-white/95 px-3 py-3 shadow-[0_20px_50px_rgba(146,64,14,0.2)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-orange-300"
        >
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff1df_0%,#ffd8ae_100%)] shadow-[0_14px_28px_rgba(249,115,22,0.22)]">
            {unreadCount > 0 ? (
              <>
                <span className="absolute inset-[-5px] rounded-full border border-rose-300/80 animate-ping" />
                <span className="absolute inset-[-9px] rounded-full bg-rose-200/30 blur-md" />
              </>
            ) : null}
            <Image src="/redfeng-favicon.png" alt="Red Feng" width={28} height={28} className="h-7 w-7 object-contain" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-rose-500 px-2 py-1 text-[11px] font-semibold leading-none text-white shadow-[0_10px_24px_rgba(244,63,94,0.28)]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold text-slate-950">{t.launcher}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{t.openThread}</span>
          </span>
          <span className="relative hidden h-3 w-3 shrink-0 sm:block">
            <span className="absolute inset-0 rounded-full bg-emerald-500" />
            <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-70 blur-[2px] group-hover:scale-125" />
          </span>
        </button>
      </div>
    </div>
  )
}
