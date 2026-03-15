"use client"

import { useState } from "react"
import { updatePackageStep2 } from "../../actions"
import { normalizeLocale } from "@/lib/i18n"
import { getMerchantWizardText, merchantWizardLanguageOptions } from "@/lib/merchant-wizard-i18n"

const LANGS = [
  { code: "id", label: "Indonesia" },
  { code: "en", label: "English" },
  { code: "zh", label: "Chinese" },
] as const

type LangCode = (typeof LANGS)[number]["code"]

type TranslationValues = {
  about_tour: string
  service_standard: string
  include: string
  exclude: string
  preparation: string
  terms_conditions: string
  meeting_point: string
  highlights: string
}

export default function EditStep2Details({
  packageId,
  defaultLanguage,
  initialTranslations,
  mapEmbed,
}: {
  packageId: string
  defaultLanguage: string
  initialTranslations: Record<string, TranslationValues>
  mapEmbed: string
}) {
  const locale = normalizeLocale(defaultLanguage)
  const t = getMerchantWizardText(locale)
  const [activeLang, setActiveLang] = useState<LangCode>(
    (LANGS.find((lang) => lang.code === defaultLanguage)?.code || "id") as LangCode,
  )

  return (
    <form action={updatePackageStep2} className="space-y-8">
      <input type="hidden" name="package_id" value={packageId} />

      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
        {t.defaultLanguageNotice}: <strong>{defaultLanguage}</strong>. Minimal isi konten bahasa default.
      </div>

      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          {merchantWizardLanguageOptions.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setActiveLang(lang.code)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                activeLang === lang.code
                  ? "bg-orange-500 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {merchantWizardLanguageOptions.map((lang) => {
              const values = initialTranslations[lang.code] || {
                about_tour: "",
                service_standard: "",
                include: "",
                exclude: "",
                preparation: "",
                terms_conditions: "",
                meeting_point: "",
                highlights: "",
              }

          return (
            <div key={lang.code} className={activeLang === lang.code ? "space-y-6" : "hidden"}>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                {t.contentLanguage}: <strong>{lang.label}</strong> ({lang.code})
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.aboutTour}</label>
                <textarea
                  name={`about_tour_${lang.code}`}
                  defaultValue={values.about_tour}
                  className="h-36 w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                  required={lang.code === defaultLanguage}
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.serviceStandard}</label>
                <textarea
                  name={`service_standard_${lang.code}`}
                  defaultValue={values.service_standard}
                  className="h-28 w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.include}</label>
                <textarea
                  name={`include_${lang.code}`}
                  defaultValue={values.include}
                  className="h-28 w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.exclude}</label>
                <textarea
                  name={`exclude_${lang.code}`}
                  defaultValue={values.exclude}
                  className="h-28 w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.preparation}</label>
                <textarea
                  name={`preparation_${lang.code}`}
                  defaultValue={values.preparation}
                  className="h-28 w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.meetingPoint}</label>
                <input
                  name={`meeting_point_${lang.code}`}
                  defaultValue={values.meeting_point}
                  className="w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.highlights}</label>
                <input
                  name={`highlights_${lang.code}`}
                  defaultValue={values.highlights}
                  className="w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.termsConditions}</label>
                <textarea
                  name={`terms_conditions_${lang.code}`}
                  defaultValue={values.terms_conditions}
                  className="h-28 w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <label className="mb-2 block font-medium text-slate-800">{t.pickupMapEmbed}</label>
        <textarea
          name="map_embed"
          defaultValue={mapEmbed}
          className="h-24 w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      <div className="flex justify-between pt-4">
        <a
          href={`?step=1`}
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
