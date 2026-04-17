"use client"

import Link from "next/link"
import { type Locale } from "@/lib/i18n"

type PublicStickyActionProps = {
  locale: Locale
  href: string
  label?: string
  summary?: string
  secondaryHref?: string
  secondaryLabel?: string
}

export default function PublicStickyAction({
  locale,
  href,
  label,
  summary,
  secondaryHref,
  secondaryLabel,
}: PublicStickyActionProps) {
  const copy = {
    id: {
      defaultLabel: "Lihat katalog paket",
      defaultSummary: "Cari paket dengan flow yang lebih enak di mobile",
      defaultSecondaryLabel: "Chat merchant",
    },
    en: {
      defaultLabel: "Open package catalog",
      defaultSummary: "Browse packages with a more app-friendly mobile flow",
      defaultSecondaryLabel: "Chat merchant",
    },
    zh: {
      defaultLabel: "打开套餐目录",
      defaultSummary: "用更适合移动端的流程浏览套餐",
      defaultSecondaryLabel: "联系商家",
    },
  }[locale]

  return (
    <div className="fixed inset-x-0 bottom-[76px] z-[75] px-4 md:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3 rounded-[24px] border border-orange-100 bg-[linear-gradient(135deg,#fffaf5_0%,#ffffff_52%,#fff1e1_100%)] px-4 py-3 shadow-[0_22px_55px_-28px_rgba(249,115,22,0.42)] backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Red Feng</p>
          <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-600">{summary || copy.defaultSummary}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {secondaryHref ? (
            <Link
              href={secondaryHref}
              className="rounded-2xl border border-orange-200 bg-white px-3 py-2.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
            >
              {secondaryLabel || copy.defaultSecondaryLabel}
            </Link>
          ) : null}
          <Link
            href={href}
            className="rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            {label || copy.defaultLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
