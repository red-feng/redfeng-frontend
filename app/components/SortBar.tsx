"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { dictionaries, type Locale } from "@/lib/i18n"

type SortOption = "popular" | "price-low"

export default function SortBar({ total, locale }: { total: number; locale: Locale }) {
  const t = dictionaries[locale].sortBar
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const currentSort = (searchParams.get("sort") === "price-low" ? "price-low" : "popular") as SortOption

  const applySort = (nextSort: SortOption) => {
    if (nextSort === currentSort) return

    const params = new URLSearchParams(searchParams.toString())
    if (nextSort === "popular") {
      params.delete("sort")
    } else {
      params.set("sort", nextSort)
    }
    params.delete("page")

    const nextQuery = params.toString()
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname
    startTransition(() => {
      router.replace(nextUrl, { scroll: false })
    })
  }

  const options: Array<{ id: SortOption; label: string }> = [
    { id: "popular", label: t.topPopularity },
    { id: "price-low", label: t.lowestPrice },
  ]

  const orderLabel = locale === "en" ? "Sort by" : locale === "zh" ? "æŽ’åºæ–¹å¼" : "Urutkan"

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-[#f3dfd3] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.18)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Katalog</p>
        <div className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-slate-950 sm:mt-2 sm:text-[26px]">
          {total} {t.packagesFound}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-500">{orderLabel}:</span>
        <div className="relative min-w-[190px]">
          <select
            value={currentSort}
            onChange={(event) => applySort(event.target.value as SortOption)}
            disabled={isPending}
            className="h-12 w-full appearance-none rounded-[18px] border border-[#eaded4] bg-white px-4 pr-11 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.25)] outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-slate-400">
            ⌄
          </span>
        </div>
      </div>
    </div>
  )
}
