"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { Locale } from "@/lib/i18n"

type FlightPaymentCountdownProps = {
  deadline: string | null | undefined
  locale?: Locale
  compact?: boolean
  refreshOnExpire?: boolean
  className?: string
}

function getCopy(locale: Locale) {
  if (locale === "en") {
    return {
      label: "Pay within",
      expired: "Payment time has expired",
    }
  }

  if (locale === "zh") {
    return {
      label: "付款倒计时",
      expired: "付款时间已过",
    }
  }

  return {
    label: "Bayar dalam",
    expired: "Batas pembayaran habis",
  }
}

function parseDeadline(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(Math.ceil(ms / 1000), 0)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export default function FlightPaymentCountdown({
  deadline,
  locale = "id",
  compact = false,
  refreshOnExpire = false,
  className = "",
}: FlightPaymentCountdownProps) {
  const router = useRouter()
  const refreshedRef = useRef(false)
  const [now, setNow] = useState(() => Date.now())
  const deadlineDate = parseDeadline(deadline)
  const copy = getCopy(locale)

  useEffect(() => {
    if (!deadlineDate) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [deadlineDate])

  const remainingMs = deadlineDate ? deadlineDate.getTime() - now : 0
  const expired = !deadlineDate || remainingMs <= 0

  useEffect(() => {
    if (!expired || !refreshOnExpire || refreshedRef.current) return
    refreshedRef.current = true
    const timer = window.setTimeout(() => router.refresh(), 900)
    return () => window.clearTimeout(timer)
  }, [expired, refreshOnExpire, router])

  if (!deadlineDate) return null

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
          expired
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-orange-200 bg-orange-50 text-orange-700"
        } ${className}`}
        aria-live="polite"
      >
        <span>{expired ? copy.expired : copy.label}</span>
        {!expired ? <span className="tabular-nums">{formatRemaining(remainingMs)}</span> : null}
      </span>
    )
  }

  return (
    <div
      className={`rounded-[18px] border px-4 py-3 ${
        expired
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-orange-200 bg-orange-50 text-orange-800"
      } ${className}`}
      aria-live="polite"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em]">{expired ? copy.expired : copy.label}</p>
      {!expired ? <p className="mt-1 text-2xl font-black tabular-nums text-slate-950">{formatRemaining(remainingMs)}</p> : null}
    </div>
  )
}
