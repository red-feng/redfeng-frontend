"use client"

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { savePackageDetails } from "./actions"
import Image from "next/image"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { getMerchantWizardText, merchantWizardLanguageOptions } from "@/lib/merchant-wizard-i18n"
import { requestMerchantAutoTranslations } from "@/lib/merchant-auto-translation-client"

const MAX_GALLERY_BYTES = 18 * 1024 * 1024
const LANGS = [
  { code: "id", label: "Indonesia" },
  { code: "en", label: "English" },
  { code: "zh", label: "Chinese" },
] as const

type LangCode = (typeof LANGS)[number]["code"]
type TranslationField =
  | "about_tour"
  | "service_standard"
  | "include"
  | "exclude"
  | "preparation"
  | "meeting_point"
  | "highlights"
  | "terms_conditions"

type TranslationValues = Record<LangCode, Record<TranslationField, string>>

const TRANSLATION_FIELDS: TranslationField[] = [
  "about_tour",
  "service_standard",
  "include",
  "exclude",
  "preparation",
  "meeting_point",
  "highlights",
  "terms_conditions",
]

function createEmptyTranslationValues(): TranslationValues {
  return {
    id: Object.fromEntries(TRANSLATION_FIELDS.map((field) => [field, ""])) as Record<TranslationField, string>,
    en: Object.fromEntries(TRANSLATION_FIELDS.map((field) => [field, ""])) as Record<TranslationField, string>,
    zh: Object.fromEntries(TRANSLATION_FIELDS.map((field) => [field, ""])) as Record<TranslationField, string>,
  }
}

export default function Step2Details({
  packageId,
  defaultLanguage,
  publishedLanguages,
  uiLocale = "id",
}: {
  packageId: string | null
  defaultLanguage: string
  publishedLanguages: string[]
  uiLocale?: string
}) {
  const [uploadError, setUploadError] = useState<string | null>(null)
  const locale = normalizeLocale(uiLocale)
  const t = getMerchantWizardText(locale)
  const normalizedDefaultLanguage = normalizeLocale(defaultLanguage)
  const [activeLang, setActiveLang] = useState<LangCode>(
    (LANGS.find((lang) => lang.code === normalizedDefaultLanguage)?.code || "id") as LangCode
  )
  const [translationValues, setTranslationValues] = useState<TranslationValues>(() => createEmptyTranslationValues())
  const [isRetranslatingLanguage, setIsRetranslatingLanguage] = useState<LangCode | null>(null)
  const manualOverridesRef = useRef<Set<string>>(new Set())
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

  const validateSelectedFiles = (files: FileList | null): boolean => {
    if (!files || files.length === 0) {
      setUploadError(null)
      return true
    }

    const totalBytes = Array.from(files).reduce((sum, file) => sum + file.size, 0)
    if (totalBytes > MAX_GALLERY_BYTES) {
      setUploadError(t.uploadTooLarge)
      return false
    }

    setUploadError(null)
    return true
  }

  const handleGalleryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const isValid = validateSelectedFiles(event.target.files)
    if (!isValid) {
      event.target.value = ""
    }
  }

  const validateGallerySize = (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget
    const fileInput = form.elements.namedItem("gallery_images") as HTMLInputElement | null
    const isValid = validateSelectedFiles(fileInput?.files ?? null)
    if (!isValid) {
      event.preventDefault()
      if (fileInput) fileInput.value = ""
    }
  }

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
        console.error("step2 auto translate error:", error)
      }
    }, 700)
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const tasks = TRANSLATION_FIELDS.map(async (field) => {
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
        console.error("step2 publish auto translate error:", error)
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
      const tasks = TRANSLATION_FIELDS.map(async (field) => {
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
      console.error("step2 retranslate language error:", error)
    } finally {
      setIsRetranslatingLanguage(null)
    }
  }

  if (!packageId) {
    return <p className="text-red-500">{t.packageIdMissing}</p>
  }

  return (
    <div className="relative min-h-screen">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/bg-wizard.png')",
        }}
      />

      <div className="relative z-10">
        <div className="px-10 py-8">
          <Image
            src="/logo-redfeng.png"
            alt="Red Feng"
            width={0}
            height={0}
            sizes="100vw"
            className="h-32 w-auto"
            priority
          />
        </div>

        <div className="flex justify-center px-8 pb-28">
          <div className="w-full max-w-5xl rounded-3xl bg-white p-14 shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
            <h1 className="mb-1 text-2xl font-bold">{t.createPackageTitle}</h1>
            <p className="mb-10 text-gray-500">{t.contentDetailsStep}</p>

            <form
              action={savePackageDetails}
              encType="multipart/form-data"
              onSubmit={validateGallerySize}
              className="space-y-8"
            >
              <input type="hidden" name="package_id" value={packageId} />

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                {t.defaultLanguageNotice}: <strong>{defaultLanguage}</strong>. Minimal isi konten bahasa default.
              </div>

              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {visibleLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setActiveLang(lang.code)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                        activeLang === lang.code
                          ? "bg-orange-500 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>

                {visibleLanguages.map((lang) => (
                  <div
                    key={lang.code}
                    className={activeLang === lang.code ? "space-y-6" : "hidden"}
                  >
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
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
                      <label className="mb-2 block font-medium">{t.aboutTour}</label>
                      <textarea
                        name={`about_tour_${lang.code}`}
                        value={translationValues[lang.code].about_tour}
                        onChange={(event) => updateTranslationField(lang.code, "about_tour", event.target.value)}
                        className="h-36 w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                        required={lang.code === normalizedDefaultLanguage}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">{t.serviceStandard}</label>
                      <textarea
                        name={`service_standard_${lang.code}`}
                        value={translationValues[lang.code].service_standard}
                        onChange={(event) => updateTranslationField(lang.code, "service_standard", event.target.value)}
                        className="h-28 w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">{t.include}</label>
                      <textarea
                        name={`include_${lang.code}`}
                        value={translationValues[lang.code].include}
                        onChange={(event) => updateTranslationField(lang.code, "include", event.target.value)}
                        className="h-28 w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">{t.exclude}</label>
                      <textarea
                        name={`exclude_${lang.code}`}
                        value={translationValues[lang.code].exclude}
                        onChange={(event) => updateTranslationField(lang.code, "exclude", event.target.value)}
                        className="h-28 w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">{t.preparation}</label>
                      <textarea
                        name={`preparation_${lang.code}`}
                        value={translationValues[lang.code].preparation}
                        onChange={(event) => updateTranslationField(lang.code, "preparation", event.target.value)}
                        className="h-28 w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">{t.meetingPoint}</label>
                      <input
                        name={`meeting_point_${lang.code}`}
                        value={translationValues[lang.code].meeting_point}
                        onChange={(event) => updateTranslationField(lang.code, "meeting_point", event.target.value)}
                        className="w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">{t.highlights}</label>
                      <input
                        name={`highlights_${lang.code}`}
                        value={translationValues[lang.code].highlights}
                        onChange={(event) => updateTranslationField(lang.code, "highlights", event.target.value)}
                        className="w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">{t.termsConditions}</label>
                      <textarea
                        name={`terms_conditions_${lang.code}`}
                        value={translationValues[lang.code].terms_conditions}
                        onChange={(event) => updateTranslationField(lang.code, "terms_conditions", event.target.value)}
                        className="h-28 w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="mb-2 block font-medium">{t.pickupMapEmbed}</label>
                <textarea
                  name="map_embed"
                  className="h-24 w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">{t.galleryImages}</label>
                <input
                  type="file"
                  name="gallery_images"
                  multiple
                  accept="image/*"
                  onChange={handleGalleryChange}
                  className="w-full rounded-lg border p-4"
                />
                <p className="mt-2 text-xs text-gray-500">{t.galleryLimitHint}</p>
                {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
              </div>

              <div className="flex justify-center pt-6">
                <button
                  type="submit"
                  className="rounded-2xl bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 px-14 py-4 text-lg font-semibold text-white shadow-[0_10px_30px_rgba(249,115,22,0.45)] transition-all duration-300 hover:scale-105"
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
