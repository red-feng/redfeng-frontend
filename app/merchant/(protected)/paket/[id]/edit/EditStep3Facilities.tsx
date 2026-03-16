"use client"

import { useMemo, useState } from "react"
import { getFacilityIcon } from "@/lib/facility-icons"
import { getFacilityCategoryLabel, getFacilityLabel } from "@/lib/facility-labels"
import type { Locale } from "@/lib/i18n"
import { updatePackageStep3 } from "../../actions"
import { getMerchantWizardText, merchantWizardLanguageOptions } from "@/lib/merchant-wizard-i18n"

type Facility = {
  id: string
  name: string
  category: string
}

export default function EditStep3Facilities({
  packageId,
  facilities,
  selectedFacilityIds,
  defaultLanguage = "id",
  publishedLanguages,
  uiLocale = "id",
}: {
  packageId: string
  facilities: Facility[]
  selectedFacilityIds: string[]
  defaultLanguage?: string
  publishedLanguages: string[]
  uiLocale?: string
}) {
  const [activeLanguage, setActiveLanguage] = useState<Locale>(
    (merchantWizardLanguageOptions.find((lang) => lang.code === defaultLanguage)?.code || "id") as Locale,
  )
  const t = getMerchantWizardText(uiLocale as Locale)
  const visibleLanguages = useMemo(
    () =>
      merchantWizardLanguageOptions.filter(
        (lang) => lang.code === defaultLanguage || publishedLanguages.includes(lang.code),
      ),
    [defaultLanguage, publishedLanguages],
  )

  const uniqueFacilities = useMemo(() => {
    const seen = new Set<string>()
    return facilities.filter((facility) => {
      const key = `${facility.category || "Lainnya"}::${facility.name.trim().toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [facilities])

  const groupedFacilities = uniqueFacilities.reduce<Record<string, Facility[]>>((acc, facility) => {
    const category = facility.category || "Lainnya"
    if (!acc[category]) acc[category] = []
    acc[category].push(facility)
    return acc
  }, {})

  return (
    <form action={updatePackageStep3} className="space-y-10">
      <input type="hidden" name="package_id" value={packageId} />

      <div className="space-y-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">
            {t.facilitiesLanguageHint}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {visibleLanguages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setActiveLanguage(lang.code)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeLanguage === lang.code
                    ? "bg-orange-500 text-white shadow-sm"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {Object.entries(groupedFacilities).map(([category, items]) => (
          <div key={category}>
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              {getFacilityCategoryLabel(category, activeLanguage)}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((facility) => (
                <label
                  key={facility.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:bg-orange-50"
                >
                  <input
                    type="checkbox"
                    name="facility_ids[]"
                    value={facility.id}
                    defaultChecked={selectedFacilityIds.includes(facility.id)}
                    className="h-5 w-5 accent-orange-500"
                  />
                  <span className="text-lg leading-none">{getFacilityIcon(facility.name)}</span>
                  <span className="text-slate-700">{getFacilityLabel(facility.name, activeLanguage)}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <a
          href={`?step=2`}
          className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
        >
          {t.back}
        </a>
        <button
          type="submit"
          className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {t.saveAndNext}
        </button>
      </div>
    </form>
  )
}
