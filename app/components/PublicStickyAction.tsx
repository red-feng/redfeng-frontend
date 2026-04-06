"use client"

import Link from "next/link"
import { type Locale } from "@/lib/i18n"

type PublicStickyActionProps = {
  locale: Locale
  href: string
  label?: string
  summary?: string
}

export default function PublicStickyAction({ locale, href, label, summary }: PublicStickyActionProps) {
  const copy = {
    id: {
      defaultLabel: "Lihat katalog paket",
      defaultSummary: "Cari paket dengan flow yang lebih enak di mobile",
    },
    en: {
      defaultLabel: "Open package catalog",
      defaultSummary: "Browse packages with a more app-friendly mobile flow",
    },
    zh: {
      defaultLabel: "打开套餐目录",
      defaultSummary: "用更适合移动端的流程浏览套餐",
    },
  }[locale]

  return (
    <div className="fixed inset-x-0 bottom-[76px] z-[75] px-4 md:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3 rounded-[24px] border border-orange-100 bg-[linear-gradient(135deg,#fffaf5_0%,#ffffff_52%,#fff1e1_100%)] px-4 py-3 shadow-[0_22px_55px_-28px_rgba(249,115,22,0.42)] backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Red Feng</p>
          <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-600">{summary || copy.defaultSummary}</p>
        </div>
        <Link
          href={href}
          className="shrink-0 rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
        >
          {label || copy.defaultLabel}
        </Link>
      </div>
    </div>
  )
}
