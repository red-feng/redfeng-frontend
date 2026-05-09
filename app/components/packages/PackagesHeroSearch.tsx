"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

export default function PackagesHeroSearch({
  placeholder,
  buttonLabel,
}: {
  placeholder: string
  buttonLabel: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedQuery = query.trim()

    startTransition(() => {
      router.push(trimmedQuery ? `/packages/catalog?country=${encodeURIComponent(trimmedQuery)}` : "/packages/catalog")
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex w-full items-center gap-3 rounded-[26px] border border-white/85 bg-white/94 p-2 shadow-[0_26px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur transition ${isPending ? "opacity-80" : "opacity-100"}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[22px] px-3 py-2 sm:px-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff3ee] text-[#ef4423]">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4 4" />
          </svg>
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[14px] text-slate-700 outline-none placeholder:text-slate-400 sm:text-[15px]"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-14 shrink-0 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#ff6a3d_0%,#ef4423_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_34px_-18px_rgba(239,68,35,0.82)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 sm:px-6"
      >
        <span className="hidden sm:inline">{buttonLabel}</span>
        <span className="sm:hidden">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4 4" />
          </svg>
        </span>
      </button>
    </form>
  )
}
