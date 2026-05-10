"use client"

import { useEffect, useRef, useState } from "react"
import { type Locale } from "@/lib/i18n"

const localeOptions: Array<{ value: Locale; label: string; badge: string }> = [
  { value: "id", label: "IDR/ID", badge: "IDR/ID" },
  { value: "en", label: "USD/EN", badge: "USD/EN" },
  { value: "zh", label: "CNY/ZH", badge: "CNY/ZH" },
]

function FlagIcon({ locale }: { locale: Locale }) {
  if (locale === "en") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 overflow-hidden rounded-full ring-1 ring-slate-200/80">
        <rect width="24" height="24" fill="#b91c1c" />
        <rect y="3" width="24" height="3" fill="#ffffff" />
        <rect y="9" width="24" height="3" fill="#ffffff" />
        <rect y="15" width="24" height="3" fill="#ffffff" />
        <rect y="21" width="24" height="3" fill="#ffffff" />
        <rect width="10" height="10" fill="#1d4ed8" />
      </svg>
    )
  }

  if (locale === "zh") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 overflow-hidden rounded-full ring-1 ring-slate-200/80">
        <rect width="24" height="24" fill="#dc2626" />
        <polygon points="6,4 7.2,7.2 10.6,7.2 7.9,9.2 9,12.3 6,10.3 3,12.3 4.1,9.2 1.4,7.2 4.8,7.2" fill="#fde047" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 overflow-hidden rounded-full ring-1 ring-slate-200/80">
      <rect width="24" height="12" fill="#dc2626" />
      <rect y="12" width="24" height="12" fill="#ffffff" />
    </svg>
  )
}

function getLanguageLabel(locale: Locale) {
  if (locale === "en") return "Change language"
  if (locale === "zh") return "Switch language"
  return "Ganti bahasa"
}

export default function AuthLocaleDropdown({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeOption = localeOptions.find((option) => option.value === locale) || localeOptions[0]

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    window.addEventListener("mousedown", handlePointerDown)
    window.addEventListener("keydown", handleEscape)

    return () => {
      window.removeEventListener("mousedown", handlePointerDown)
      window.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  const changeLocale = async (nextLocale: Locale) => {
    if (nextLocale === locale || isPending) {
      setOpen(false)
      return
    }

    setIsPending(true)

    const response = await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    })

    if (!response.ok) {
      setIsPending(false)
      setOpen(false)
      return
    }

    window.location.reload()
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={isPending}
        className="inline-flex min-w-[180px] items-center justify-between gap-3 rounded-[18px] border border-orange-200 bg-white/95 px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-[0_12px_30px_rgba(148,64,14,0.08)] transition hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={getLanguageLabel(locale)}
      >
        <span className="flex items-center gap-3">
          <FlagIcon locale={activeOption.value} />
          <span className="flex flex-col leading-tight">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {isPending ? "..." : activeOption.badge}
            </span>
            <span>{activeOption.label}</span>
          </span>
        </span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 fill-current text-slate-400 transition ${open ? "rotate-180" : ""}`}>
          <path d="M5.47 7.97a.75.75 0 0 1 1.06 0L10 11.44l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-3 w-full min-w-[220px] rounded-[22px] border border-orange-100 bg-white p-2 shadow-[0_20px_48px_rgba(148,64,14,0.14)]"
        >
          {localeOptions.map((option) => {
            const active = option.value === locale

            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => void changeLocale(option.value)}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                  active ? "bg-orange-50 text-orange-700" : "text-slate-700 hover:bg-orange-50/70 hover:text-orange-700"
                }`}
              >
                <span className="flex items-center gap-3">
                  <FlagIcon locale={option.value} />
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{option.badge}</span>
                  </span>
                </span>
                <span className={`text-xs font-semibold uppercase tracking-[0.22em] ${active ? "text-orange-600" : "text-transparent"}`}>
                  Active
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
