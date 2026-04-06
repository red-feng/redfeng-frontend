import { dictionaries, type Locale } from "@/lib/i18n"

export default function SortBar({ total, locale }: { total: number; locale: Locale }) {
  const t = dictionaries[locale].sortBar
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-base font-semibold sm:text-lg">
          {total} {t.packagesFound}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3">
        <button className="rounded-full border bg-gray-50 px-4 py-2 text-sm">
          {t.topPopularity}
        </button>
        <button className="rounded-full border bg-gray-50 px-4 py-2 text-sm">
          {t.lowestPrice}
        </button>
      </div>
    </div>
  )
}
