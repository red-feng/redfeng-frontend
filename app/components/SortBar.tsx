"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { dictionaries, type Locale } from "@/lib/i18n"

type SortOption = "popular" | "price-low"

type SortBarSummary = {
  leadLabel: string
  leadValue: string
  metricA: { label: string; value: string }
  metricB: { label: string; value: string }
  metricC: { label: string; value: string }
}

export default function SortBar({
  total,
  locale,
  summary,
}: {
  total: number
  locale: Locale
  summary?: SortBarSummary | null
}) {
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

  const orderLabel = locale === "en" ? "Sort by" : locale === "zh" ? "排序方式" : "Urutkan"

  return (
    <div className="rounded-[24px] border border-[#eef1f6] bg-white p-4 shadow-[0_22px_52px_-38px_rgba(15,23,42,0.18)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] font-medium text-slate-500">
          {total} {t.packagesFound}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] text-slate-500">{orderLabel}:</span>
          <div className="relative min-w-[190px]">
            <select
              value={currentSort}
              onChange={(event) => applySort(event.target.value as SortOption)}
              disabled={isPending}
              className="h-12 w-full appearance-none rounded-[12px] border border-[#eceff4] bg-[#fcfdff] px-4 pr-11 text-[13px] font-medium text-slate-700 outline-none transition hover:bg-slate-50 focus:border-orange-300 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 16 16"
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-400 stroke-[2]"
              aria-hidden="true"
            >
              <path d="M3.5 6.5 8 11l4.5-4.5" />
            </svg>
          </div>
        </div>
      </div>

      {summary ? (
        <div className="mt-4 grid overflow-hidden rounded-[18px] border border-[#f0f1f5] xl:grid-cols-4">
          <div className="bg-[#fffaf7] px-6 py-4 text-left text-[#ef5b2a] shadow-[inset_0_0_0_1px_rgba(239,91,42,0.18)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em]">{summary.leadLabel}</p>
            <p className="mt-1 text-[13px] font-medium opacity-90">{summary.leadValue}</p>
          </div>
          <div className="border-t border-[#f0f1f5] px-6 py-4 text-left xl:border-l xl:border-t-0">
            <p className="text-[13px] text-slate-500">{summary.metricA.label}</p>
            <p className="mt-1 text-[15px] font-semibold text-slate-900">{summary.metricA.value}</p>
          </div>
          <div className="border-t border-[#f0f1f5] px-6 py-4 text-left xl:border-l xl:border-t-0">
            <p className="text-[13px] text-slate-500">{summary.metricB.label}</p>
            <p className="mt-1 text-[15px] font-semibold text-slate-900">{summary.metricB.value}</p>
          </div>
          <div className="border-t border-[#f0f1f5] px-6 py-4 text-left xl:border-l xl:border-t-0">
            <p className="text-[13px] text-slate-500">{summary.metricC.label}</p>
            <p className="mt-1 text-[15px] font-semibold text-slate-900">{summary.metricC.value}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
