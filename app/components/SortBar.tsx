import { dictionaries, type Locale } from "@/lib/i18n"

export default function SortBar({ total, locale }: { total: number; locale: Locale }) {
  const t = dictionaries[locale].sortBar
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border flex justify-between items-center mb-6">
      <div>
        <div className="text-lg font-semibold">
          {total} {t.packagesFound}
        </div>
      </div>

      <div className="flex gap-3">
        <button className="border px-4 py-2 rounded-full text-sm bg-gray-50">
          {t.topPopularity}
        </button>
        <button className="border px-4 py-2 rounded-full text-sm bg-gray-50">
          {t.lowestPrice}
        </button>
      </div>
    </div>
  )
}
