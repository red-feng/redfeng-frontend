"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"

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
  chips: string[]
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

const copyByLocale: Record<string, WidgetCopy> = {
  id: {
    launcher: "Bantuan admin",
    badge: "Admin Help Desk",
    title: "Butuh bantuan dari admin Red Feng?",
    subtitle: "Gunakan panel ini untuk follow-up verifikasi, paket, booking, atau payout merchant Anda.",
    adminName: "Tim Admin Red Feng",
    adminRole: "Merchant support",
    adminMessage: "Halo, kami siap bantu untuk review paket, klarifikasi operasional, dan follow-up kendala merchant.",
    chips: ["Review paket", "Kendala booking", "Payout", "Verifikasi akun"],
    responseLabel: "Estimasi respons",
    responseValue: "< 15 menit pada jam operasional",
    primaryAction: "Kirim pesan",
    secondaryAction: "Buka chat customer",
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
  },
  en: {
    launcher: "Admin help",
    badge: "Admin Help Desk",
    title: "Need help from the Red Feng admin team?",
    subtitle: "Use this panel for verification follow-ups, package review, booking issues, or payout questions.",
    adminName: "Red Feng Admin Team",
    adminRole: "Merchant support",
    adminMessage: "Hello, we are ready to help with package reviews, operational clarification, and merchant issue follow-up.",
    chips: ["Package review", "Booking issue", "Payout", "Account verification"],
    responseLabel: "Response time",
    responseValue: "< 15 minutes during working hours",
    primaryAction: "Send message",
    secondaryAction: "Open customer chat",
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
  },
  zh: {
    launcher: "Admin help",
    badge: "Admin Help Desk",
    title: "Need help from the Red Feng admin team?",
    subtitle: "Use this panel for verification follow-ups, package review, booking issues, or payout questions.",
    adminName: "Red Feng Admin Team",
    adminRole: "Merchant support",
    adminMessage: "Hello, we are ready to help with package reviews, operational clarification, and merchant issue follow-up.",
    chips: ["Package review", "Booking issue", "Payout", "Account verification"],
    responseLabel: "Response time",
    responseValue: "< 15 minutes during working hours",
    primaryAction: "Send message",
    secondaryAction: "Open customer chat",
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
  },
}

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
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const threadRef = useRef<HTMLDivElement | null>(null)

  const t = copyByLocale[locale] || copyByLocale.id
  const mailtoHref = useMemo(() => buildMailtoHref({ merchantLabel, merchantCode }), [merchantCode, merchantLabel])
  const hideOnChatPage = pathname === "/merchant/chat"

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function loadRoom() {
      try {
        setLoading(true)
        const response = await fetch("/api/merchant-support/room", { cache: "no-store" })
        const payload = (await response.json().catch(() => null)) as SupportRoomPayload | null
        if (!response.ok) {
          throw new Error(payload?.error || t.errorLoad)
        }
        if (cancelled) return
        setMessages(payload?.messages || [])
        setLoaded(true)
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
    const intervalId = window.setInterval(() => {
      void loadRoom()
    }, 15000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [open, t.errorLoad])

  useEffect(() => {
    if (!open) return
    const container = threadRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages, open])

  if (hideOnChatPage) return null

  async function handleSendMessage() {
    const message = draft.trim()
    if (!message || sending) return

    try {
      setSending(true)
      setErrorMessage("")

      const response = await fetch("/api/merchant-support/send", {
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
          <section className="w-[min(92vw,400px)] overflow-hidden rounded-[28px] border border-orange-200/80 bg-[linear-gradient(180deg,rgba(255,250,243,0.98)_0%,rgba(255,255,255,0.98)_100%)] shadow-[0_28px_80px_rgba(146,64,14,0.22)] backdrop-blur-xl">
            <div className="relative overflow-hidden border-b border-orange-100 bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_56%,#fdba74_100%)] px-5 py-5 text-white">
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-50">
                      {t.badge}
                    </span>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight">{t.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-orange-50/90">{t.subtitle}</p>
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

            <div className="space-y-4 p-5">
              <div className="rounded-[24px] border border-[#f1dcc5] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff0df_0%,#ffe1bf_100%)] shadow-[0_10px_24px_rgba(249,115,22,0.18)]">
                    <Image src="/redfeng-favicon.png" alt="Red Feng" width={26} height={26} className="h-6 w-6 object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-950">{t.adminName}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-600">{t.adminRole}</p>
                    <div className="mt-3 rounded-[18px] border border-orange-100 bg-[#fff7ef] px-4 py-3 text-sm leading-6 text-slate-700">
                      {t.adminMessage}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#f1e6d7] bg-[#fffdf9] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{t.responseLabel}</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{t.responseValue}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {t.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-semibold text-orange-700"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-6 text-slate-500">{t.helperNote}</p>
              </div>

              <div className="rounded-[24px] border border-[#f1e6d7] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{t.merchantLabel}</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{merchantLabel}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-orange-600">{merchantCode}</p>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-[#f1e6d7] bg-white">
                <div
                  ref={threadRef}
                  className="max-h-[260px] space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#fffdf9_0%,#fff7ef_100%)] px-4 py-4"
                >
                  {loading && !loaded ? <p className="text-sm text-slate-500">{t.loading}</p> : null}
                  {!loading && messages.length === 0 ? <p className="text-sm leading-6 text-slate-500">{t.emptyState}</p> : null}
                  {messages.map((message) => {
                    if (message.sender_role === "system") {
                      return (
                        <div key={message.id} className="flex justify-center">
                          <div className="max-w-[92%] rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-center text-xs font-medium text-orange-700">
                            {message.message}
                          </div>
                        </div>
                      )
                    }

                    const mine = message.sender_role === "merchant"
                    return (
                      <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-[20px] px-4 py-3 shadow-sm ${
                            mine
                              ? "bg-[linear-gradient(135deg,#ea580c_0%,#fb923c_100%)] text-white"
                              : "border border-[#eedfcc] bg-white text-slate-700"
                          }`}
                        >
                          <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${mine ? "text-orange-100" : "text-orange-600"}`}>
                            {mine ? t.youLabel : t.adminReplyLabel}
                          </p>
                          <p className="mt-2 whitespace-pre-line text-sm leading-6">{message.message}</p>
                          <p className={`mt-2 text-[11px] ${mine ? "text-orange-100/90" : "text-slate-400"}`}>
                            {formatTimeLabel(message.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="border-t border-[#f1e6d7] px-4 py-4">
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
                      className="min-h-24 w-full rounded-[18px] border border-[#e7d8c5] bg-[#fffdf9] px-4 py-3 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => void handleSendMessage()}
                        disabled={sending || !draft.trim()}
                        className="inline-flex flex-1 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ea580c_0%,#f97316_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(249,115,22,0.24)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_36px_rgba(249,115,22,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
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
                        href="/merchant/chat"
                        className="inline-flex items-center justify-center rounded-[18px] border border-[#ead8c0] bg-[#fffaf4] px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-white hover:text-orange-600"
                      >
                        {t.secondaryAction}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <button
          type="button"
          aria-label={t.launcher}
          onClick={() => setOpen((current) => !current)}
          className="group flex items-center gap-3 rounded-full border border-orange-200/80 bg-white/95 px-3 py-3 shadow-[0_20px_50px_rgba(146,64,14,0.2)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-orange-300"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff1df_0%,#ffd8ae_100%)] shadow-[0_14px_28px_rgba(249,115,22,0.22)]">
            <Image src="/redfeng-favicon.png" alt="Red Feng" width={28} height={28} className="h-7 w-7 object-contain" />
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
