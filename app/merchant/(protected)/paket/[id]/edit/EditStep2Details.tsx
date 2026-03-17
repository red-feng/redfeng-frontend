"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { updatePackageStep2 } from "../../actions"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { getMerchantWizardText, merchantWizardLanguageOptions } from "@/lib/merchant-wizard-i18n"
import { requestMerchantAutoTranslations } from "@/lib/merchant-auto-translation-client"

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

type TranslationField = keyof TranslationValues

const EMPTY_VALUES: TranslationValues = {
  about_tour: "",
  service_standard: "",
  include: "",
  exclude: "",
  preparation: "",
  terms_conditions: "",
  meeting_point: "",
  highlights: "",
}

function normalizeTranslationValues(input?: Partial<TranslationValues> | null): TranslationValues {
  return {
    about_tour: String(input?.about_tour || ""),
    service_standard: String(input?.service_standard || ""),
    include: String(input?.include || ""),
    exclude: String(input?.exclude || ""),
    preparation: String(input?.preparation || ""),
    terms_conditions: String(input?.terms_conditions || ""),
    meeting_point: String(input?.meeting_point || ""),
    highlights: String(input?.highlights || ""),
  }
}

export default function EditStep2Details({
  packageId,
  defaultLanguage,
  publishedLanguages,
  initialTranslations,
  mapEmbed,
  uiLocale = "id",
}: {
  packageId: string
  defaultLanguage: string
  publishedLanguages: string[]
  initialTranslations: Record<string, Partial<TranslationValues>>
  mapEmbed: string
  uiLocale?: string
}) {
  const locale = normalizeLocale(uiLocale)
  const t = getMerchantWizardText(locale)
  const normalizedDefaultLanguage = normalizeLocale(defaultLanguage)
  const [activeLang, setActiveLang] = useState<LangCode>(
    (LANGS.find((lang) => lang.code === normalizedDefaultLanguage)?.code || "id") as LangCode,
  )
  const [translationValues, setTranslationValues] = useState<Record<LangCode, TranslationValues>>(() => ({
    id: normalizeTranslationValues(initialTranslations.id),
    en: normalizeTranslationValues(initialTranslations.en),
    zh: normalizeTranslationValues(initialTranslations.zh),
  }))
  const [isRetranslatingLanguage, setIsRetranslatingLanguage] = useState<LangCode | null>(null)
  const manualOverridesRef = useRef<Set<string>>(
    new Set(
        (["id", "en", "zh"] as LangCode[]).flatMap((language) => {
        if (language === normalizedDefaultLanguage) return []
        const values = normalizeTranslationValues(initialTranslations[language])
        if (!values) return []
        return (Object.keys(values) as TranslationField[])
          .filter((field) => values[field]?.trim())
          .map((field) => `${language}:${field}`)
      }),
    ),
  )
  const translationTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const targetLanguages = useMemo(
    () =>
      merchantWizardLanguageOptions
        .map((lang) => lang.code)
        .filter(
          (lang): lang is Locale =>
            lang !== normalizedDefaultLanguage && publishedLanguages.includes(lang),
        ),
    [normalizedDefaultLanguage, publishedLanguages],
  )
  const visibleLanguages = useMemo(
    () =>
      merchantWizardLanguageOptions.filter(
        (lang) => lang.code === normalizedDefaultLanguage || publishedLanguages.includes(lang.code),
      ),
    [normalizedDefaultLanguage, publishedLanguages],
  )

  useEffect(() => {
    const timers = translationTimersRef.current
    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer))
    }
  }, [])

  useEffect(() => {
    if (!visibleLanguages.some((lang) => lang.code === activeLang)) {
      setActiveLang(normalizedDefaultLanguage)
    }
  }, [activeLang, normalizedDefaultLanguage, visibleLanguages])

  const scheduleAutoTranslate = (field: TranslationField, sourceValue: string) => {
    const timerKey = `${field}:${normalizedDefaultLanguage}`
    if (translationTimersRef.current[timerKey]) {
      clearTimeout(translationTimersRef.current[timerKey])
    }

    if (!sourceValue.trim()) {
      setTranslationValues((prev) => {
        const next = { ...prev }
        for (const language of targetLanguages) {
          const manualKey = `${language}:${field}`
          if (!manualOverridesRef.current.has(manualKey)) {
            next[language] = { ...next[language], [field]: "" }
          }
        }
        return next
      })
      return
    }

    translationTimersRef.current[timerKey] = setTimeout(async () => {
      try {
        const translations = await requestMerchantAutoTranslations({
          text: sourceValue,
          sourceLanguage: normalizedDefaultLanguage,
          targetLanguages,
        })

        setTranslationValues((prev) => {
          const next = { ...prev }
          for (const language of targetLanguages) {
            const translatedValue = translations[language]
            const manualKey = `${language}:${field}`
            if (!manualOverridesRef.current.has(manualKey) && typeof translatedValue === "string") {
              next[language] = { ...next[language], [field]: translatedValue }
            }
          }
          return next
        })
      } catch (error) {
        console.error("edit step2 auto translate error:", error)
      }
    }, 700)
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const tasks = (Object.keys(EMPTY_VALUES) as TranslationField[]).map(async (field) => {
          const sourceValue = translationValues[normalizedDefaultLanguage][field]
          const pendingTargets = targetLanguages.filter(
            (language) =>
              !manualOverridesRef.current.has(`${language}:${field}`) &&
              !translationValues[language][field]?.trim(),
          )

          if (!sourceValue.trim() || pendingTargets.length === 0) return null

          const translations = await requestMerchantAutoTranslations({
            text: sourceValue,
            sourceLanguage: normalizedDefaultLanguage,
            targetLanguages: pendingTargets,
          })

          return { field, pendingTargets, translations }
        })

        const results = await Promise.all(tasks)

        setTranslationValues((prev) => {
          const next = { ...prev }
          for (const result of results) {
            if (!result) continue
            for (const language of result.pendingTargets) {
              const translatedValue = result.translations[language]
              if (!manualOverridesRef.current.has(`${language}:${result.field}`) && typeof translatedValue === "string") {
                next[language] = {
                  ...next[language],
                  [result.field]: next[language][result.field] || translatedValue,
                }
              }
            }
          }
          return next
        })
      } catch (error) {
        console.error("edit step2 publish auto translate error:", error)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [normalizedDefaultLanguage, targetLanguages, translationValues])

  const updateTranslationField = (language: LangCode, field: TranslationField, value: string) => {
    setTranslationValues((prev) => ({
      ...prev,
      [language]: {
        ...prev[language],
        [field]: value,
      },
    }))

    if (language !== normalizedDefaultLanguage) {
      manualOverridesRef.current.add(`${language}:${field}`)
      return
    }

    scheduleAutoTranslate(field, value)
  }

  const retranslateLanguage = async (language: LangCode) => {
    if (language === normalizedDefaultLanguage || !publishedLanguages.includes(language)) return

    setIsRetranslatingLanguage(language)
    try {
      const tasks = (Object.keys(EMPTY_VALUES) as TranslationField[]).map(async (field) => {
        const sourceValue = translationValues[normalizedDefaultLanguage][field]
        if (!sourceValue.trim()) return { field, value: "" }

        const translations = await requestMerchantAutoTranslations({
          text: sourceValue,
          sourceLanguage: normalizedDefaultLanguage,
          targetLanguages: [language],
        })

        return { field, value: translations[language] || "" }
      })

      const results = await Promise.all(tasks)

      setTranslationValues((prev) => ({
        ...prev,
        [language]: results.reduce(
          (acc, result) => ({ ...acc, [result.field]: result.value }),
          { ...prev[language] },
        ),
      }))
    } catch (error) {
      console.error("edit step2 retranslate language error:", error)
    } finally {
      setIsRetranslatingLanguage(null)
    }
  }

  return (
    <form action={updatePackageStep2} className="space-y-8">
      <input type="hidden" name="package_id" value={packageId} />

      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
        {t.defaultLanguageNotice}: <strong>{defaultLanguage}</strong>. Minimal isi konten bahasa default.
      </div>

      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          {visibleLanguages.map((lang) => (
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

        {visibleLanguages.map((lang) => {
              const values = translationValues[lang.code] || { ...EMPTY_VALUES }

          return (
            <div key={lang.code} className={activeLang === lang.code ? "space-y-6" : "hidden"}>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    {t.contentLanguage}: <strong>{lang.label}</strong> ({lang.code})
                  </span>
                  {lang.code !== normalizedDefaultLanguage && publishedLanguages.includes(lang.code) && (
                    <button
                      type="button"
                      onClick={() => void retranslateLanguage(lang.code)}
                      disabled={isRetranslatingLanguage === lang.code}
                      className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRetranslatingLanguage === lang.code
                        ? (t.retranslateInProgress || "Translating...")
                        : (t.retranslate || "Retranslate")}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.aboutTour}</label>
                <textarea
                  name={`about_tour_${lang.code}`}
                  value={values.about_tour}
                  onChange={(event) => updateTranslationField(lang.code, "about_tour", event.target.value)}
                  className="h-36 w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                  required={lang.code === normalizedDefaultLanguage}
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.serviceStandard}</label>
                <textarea
                  name={`service_standard_${lang.code}`}
                  value={values.service_standard}
                  onChange={(event) => updateTranslationField(lang.code, "service_standard", event.target.value)}
                  className="h-28 w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.include}</label>
                <textarea
                  name={`include_${lang.code}`}
                  value={values.include}
                  onChange={(event) => updateTranslationField(lang.code, "include", event.target.value)}
                  className="h-28 w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.exclude}</label>
                <textarea
                  name={`exclude_${lang.code}`}
                  value={values.exclude}
                  onChange={(event) => updateTranslationField(lang.code, "exclude", event.target.value)}
                  className="h-28 w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.preparation}</label>
                <textarea
                  name={`preparation_${lang.code}`}
                  value={values.preparation}
                  onChange={(event) => updateTranslationField(lang.code, "preparation", event.target.value)}
                  className="h-28 w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.meetingPoint}</label>
                <input
                  name={`meeting_point_${lang.code}`}
                  value={values.meeting_point}
                  onChange={(event) => updateTranslationField(lang.code, "meeting_point", event.target.value)}
                  className="w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.highlights}</label>
                <input
                  name={`highlights_${lang.code}`}
                  value={values.highlights}
                  onChange={(event) => updateTranslationField(lang.code, "highlights", event.target.value)}
                  className="w-full rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-800">{t.termsConditions}</label>
                <textarea
                  name={`terms_conditions_${lang.code}`}
                  value={values.terms_conditions}
                  onChange={(event) => updateTranslationField(lang.code, "terms_conditions", event.target.value)}
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
