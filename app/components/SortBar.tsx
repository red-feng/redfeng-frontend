import { dictionaries, type Locale } from "@/lib/i18n"

export default function SortBar({ total, locale }: { total: number; locale: Locale }) {
  const t = dictionaries[locale].sortBar
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[24px] border border-orange-100 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf4_100%)] p-4 shadow-[0_18px_40px_-30px_rgba(249,115,22,0.35)] sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500 sm:hidden">Explore</p>
        <div className="mt-1 text-base font-semibold sm:mt-0 sm:text-lg">
          {total} {t.packagesFound}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3">
        <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
          {t.topPopularity}
        </button>
        <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
          {t.lowestPrice}
        </button>
      </div>
    </div>
  )
}
