"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { saveFacilities } from "./actions"
import Image from "next/image"
import { getFacilityIcon } from "@/lib/facility-icons"
import { getFacilityCategoryLabel, getFacilityLabel } from "@/lib/facility-labels"
import type { Locale } from "@/lib/i18n"
import { getMerchantWizardText, merchantWizardLanguageOptions } from "@/lib/merchant-wizard-i18n"

type Facility = {
  id: string
  name: string
  category: string
}

export default function Step3Facilities({
  packageId,
  defaultLanguage = "id",
  publishedLanguages,
  uiLocale = "id",
}: {
  packageId: string | null
  defaultLanguage?: string
  publishedLanguages: string[]
  uiLocale?: string
}) {
  const [facilities, setFacilities] = useState<Facility[]>([])
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

  useEffect(() => {
    const fetchFacilities = async () => {
      const supabase = createClient("merchant")
      const { data } = await supabase
        .from("facilities")
        .select("*")
        .order("category", { ascending: true })

      setFacilities((data as Facility[] | null) || [])
    }

    fetchFacilities()
  }, [])

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

  if (!packageId) {
    return <p className="text-red-500">{t.packageIdMissing}</p>
  }

 
  return (
    <div className="relative min-h-screen">

      {/* BACKGROUND IMAGE */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/bg-wizard.png')"
        }}
      />

     
      {/* CONTENT */}
      <div className="relative z-10">

      {/* HEADER AREA */}
            <div className="px-8 py-6">
              <Image
                        src="/home-assets/logo-redfeng-header.png"
                        alt="Red Feng"
                        width={1536}
                        height={1024}
                        className="h-32 w-auto"
                        priority
                      />
                    </div>

      {/* CONTENT WRAPPER */}
      <div className="flex justify-center px-8 pb-28">

        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-14">

          <h1 className="text-2xl font-bold mb-1">
            {t.createPackageTitle}
          </h1>

          <p className="text-gray-500 mb-10">
            {t.facilitiesStep}
          </p>

          <form action={saveFacilities} className="space-y-10">
            <input type="hidden" name="package_id" value={packageId} />

            {/* FACILITIES GRID */}
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
                  <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                    {items.map((facility) => (
                      <label
                        key={facility.id}
                        className="flex items-center gap-3 rounded-xl border p-4 transition cursor-pointer hover:bg-orange-50"
                      >
                        <input
                          type="checkbox"
                          name="facility_ids[]"
                          value={facility.id}
                          className="h-5 w-5 accent-orange-500"
                        />
                        <span className="text-lg leading-none">
                          {getFacilityIcon(facility.name)}
                        </span>
                        <span className="text-gray-700">
                          {getFacilityLabel(facility.name, activeLanguage)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* BUTTON */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                className="px-14 py-3 rounded-xl font-semibold 
                           bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300
                           text-white
                           shadow-[0_8px_20px_rgba(249,115,22,0.4)]
                           hover:scale-105
                           transition-all duration-300"
              >
                {t.saveAndNext}
              </button>
            </div>

          </form>

        </div>
      </div>
      </div>
    </div>
  )
}
