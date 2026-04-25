"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

type AdminDashboardToolbarActionsProps = {
  alertsCount: number
  alertsHref: string
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M17.7 6.3A8 8 0 106 18.5h2.4a1 1 0 010 2H6a2 2 0 01-2-2v-2.4a1 1 0 112 0v1A10 10 0 1119.1 7H17a1 1 0 110-2h3.6a1 1 0 011 1V9.6a1 1 0 11-2 0V6.3h-2.9z"
        fill="currentColor"
      />
    </svg>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M12 3a5 5 0 015 5v2.1c0 1.4.5 2.7 1.4 3.8l1.1 1.3a1.5 1.5 0 01-1.2 2.5H5.7a1.5 1.5 0 01-1.2-2.5l1.1-1.3A5.9 5.9 0 007 10.1V8a5 5 0 015-5zm0 18a3 3 0 002.8-2h-5.6A3 3 0 0012 21z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function AdminDashboardToolbarActions({
  alertsCount,
  alertsHref,
}: AdminDashboardToolbarActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <>
      <button
        type="button"
        onClick={() => {
          startTransition(() => {
            router.refresh()
          })
        }}
        aria-label="Refresh dashboard"
        title="Refresh dashboard"
        disabled={isPending}
        className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-[#e9eef6] bg-white text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition hover:text-orange-600 disabled:cursor-wait disabled:opacity-70"
      >
        <RefreshIcon className={`h-5 w-5 ${isPending ? "animate-spin" : ""}`} />
      </button>
      <Link
        href={alertsHref}
        aria-label={`Buka alert dan notifikasi${alertsCount > 0 ? `, ${alertsCount} sinyal aktif` : ""}`}
        title={alertsCount > 0 ? `${alertsCount} sinyal aktif` : "Tidak ada sinyal aktif"}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-[#e9eef6] bg-white text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition hover:text-orange-600"
      >
        <BellIcon className="h-5 w-5" />
        {alertsCount > 0 ? (
          <span className="absolute right-2 top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {alertsCount}
          </span>
        ) : null}
      </Link>
    </>
  )
}
