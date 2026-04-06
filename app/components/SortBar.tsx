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

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[24px] border border-orange-100 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf4_100%)] p-4 shadow-[0_18px_40px_-30px_rgba(249,115,22,0.35)] sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500 sm:hidden">Explore</p>
        <div className="mt-1 text-base font-semibold sm:mt-0 sm:text-lg">
          {total} {t.packagesFound}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3">
        {options.map((option) => {
          const isActive = option.id === currentSort
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => applySort(option.id)}
              disabled={isPending}
              className={`rounded-full px-4 py-2 text-sm shadow-sm transition ${
                isActive
                  ? "border border-orange-200 bg-orange-500 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
