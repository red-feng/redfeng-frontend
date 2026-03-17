"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { updatePackageStep1 } from "../../actions"
import { getParticipantFieldLabel, isQuotaTravelStyle, travelStyleOptions } from "@/lib/travelStyles"
import { getMerchantWizardText, merchantWizardLanguageOptions } from "@/lib/merchant-wizard-i18n"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { requestMerchantAutoTranslations } from "@/lib/merchant-auto-translation-client"
import { normalizePackageCurrency, normalizePackagePriceInput, packageCurrencyOptions } from "@/lib/package-pricing"

type Country = {
  id: string
  name: string
}

type Step1InitialData = {
  title: string
  travel_style: string
  departure_date: string
  origin_country_id: string
  origin_province: string
  destination_country_id: string
  destination_province: string
  currency: string
  minimal_peserta: number
  duration: number
  price_adult: number
  price_child: number
  default_language: string
  published_languages: string[]
  titles: Record<Locale, string>
  pricing: Record<Locale, { currency: string; price_adult: number; price_child: number }>
}

export default function EditStep1Basic({
  packageId,
  countries,
  initialData,
  uiLocale = "id",
}: {
  packageId: string
  countries: Country[]
  initialData: Step1InitialData
  uiLocale?: string
}) {
  const [defaultLanguage, setDefaultLanguage] = useState(initialData.default_language || "id")
  const [travelStyle, setTravelStyle] = useState(initialData.travel_style || "")
  const [activeTitleLang, setActiveTitleLang] = useState<Locale>(normalizeLocale(initialData.default_language || "id"))
  const [activePricingLang, setActivePricingLang] = useState<Locale>(normalizeLocale(initialData.default_language || "id"))
  const [publishedLanguages, setPublishedLanguages] = useState<string[]>(
    initialData.published_languages.length > 0 ? initialData.published_languages : [initialData.default_language || "id"],
  )
  const [titleValues, setTitleValues] = useState<Record<Locale, string>>(initialData.titles)
  const [pricingValues, setPricingValues] = useState<Record<Locale, { currency: string; price_adult: string; price_child: string }>>({
    id: {
      currency: normalizePackageCurrency(initialData.pricing.id?.currency),
      price_adult: String(initialData.pricing.id?.price_adult ?? ""),
      price_child: String(initialData.pricing.id?.price_child ?? ""),
    },
    en: {
      currency: normalizePackageCurrency(initialData.pricing.en?.currency || "USD"),
      price_adult: String(initialData.pricing.en?.price_adult ?? ""),
      price_child: String(initialData.pricing.en?.price_child ?? ""),
    },
    zh: {
      currency: normalizePackageCurrency(initialData.pricing.zh?.currency || "CNY"),
      price_adult: String(initialData.pricing.zh?.price_adult ?? ""),
      price_child: String(initialData.pricing.zh?.price_child ?? ""),
    },
  })
  const [isRetranslatingTitle, setIsRetranslatingTitle] = useState(false)
  const manualTitleOverridesRef = useRef<Set<Locale>>(
    new Set(
      (["id", "en", "zh"] as Locale[]).filter(
        (language) => language !== normalizeLocale(initialData.default_language || "id") && Boolean(initialData.titles[language]?.trim()),
      ),
    ),
  )
  const titleTranslationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const locale = normalizeLocale(uiLocale)
  const t = getMerchantWizardText(locale)
  const normalizedDefaultLanguage = normalizeLocale(defaultLanguage)
  const titleTargetLanguages = useMemo(
    () =>
      merchantWizardLanguageOptions
        .map((language) => language.code)
        .filter(
          (language): language is Locale =>
            language !== normalizedDefaultLanguage && publishedLanguages.includes(language),
        ),
    [normalizedDefaultLanguage, publishedLanguages],
  )
  const visibleLanguages = useMemo(
    () =>
      merchantWizardLanguageOptions.filter(
        (language) => language.code === normalizedDefaultLanguage || publishedLanguages.includes(language.code),
      ),
    [normalizedDefaultLanguage, publishedLanguages],
  )

  useEffect(() => {
    const timer = titleTranslationTimerRef.current
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!visibleLanguages.some((language) => language.code === activeTitleLang)) {
      setActiveTitleLang(normalizedDefaultLanguage)
    }
  }, [activeTitleLang, normalizedDefaultLanguage, visibleLanguages])

  useEffect(() => {
    if (!visibleLanguages.some((language) => language.code === activePricingLang)) {
      setActivePricingLang(normalizedDefaultLanguage)
    }
  }, [activePricingLang, normalizedDefaultLanguage, visibleLanguages])

  const copyPricingFromLanguage = useCallback((source: Locale, target: Locale) => {
    setPricingValues((prev) => {
      const sourcePricing = prev[source]
      const targetPricing = prev[target]
      if (!sourcePricing || !targetPricing) return prev
      if (targetPricing.price_adult || targetPricing.price_child) return prev

      return {
        ...prev,
        [target]: {
          currency: targetPricing.currency || sourcePricing.currency,
          price_adult: sourcePricing.price_adult,
          price_child: sourcePricing.price_child,
        },
      }
    })
  }, [])

  const onDefaultLanguageChange = (nextDefault: string) => {
    const nextLocale = normalizeLocale(nextDefault)
    setDefaultLanguage(nextDefault)
    setActiveTitleLang(nextLocale)
    setActivePricingLang(nextLocale)
    setPublishedLanguages((prev) => (prev.includes(nextDefault) ? prev : [...prev, nextDefault]))
    copyPricingFromLanguage(normalizedDefaultLanguage, nextLocale)
  }

  const translateTitleForTargets = useCallback(async (targets: Locale[]) => {
    const sourceValue = titleValues[normalizedDefaultLanguage]
    const pendingTargets = targets.filter(
      (language) => !manualTitleOverridesRef.current.has(language) && !titleValues[language]?.trim(),
    )

    if (!sourceValue.trim() || pendingTargets.length === 0) return

    try {
      const translations = await requestMerchantAutoTranslations({
        text: sourceValue,
        sourceLanguage: normalizedDefaultLanguage,
        targetLanguages: pendingTargets,
      })

      setTitleValues((prev) => {
        const next = { ...prev }
        for (const language of pendingTargets) {
          if (!manualTitleOverridesRef.current.has(language) && typeof translations[language] === "string") {
            next[language] = prev[language] || translations[language] || ""
          }
        }
        return next
      })
    } catch (error) {
      console.error("edit step1 publish language auto translate error:", error)
    }
  }, [normalizedDefaultLanguage, titleValues])

  const onTogglePublishedLanguage = (code: string, checked: boolean) => {
    if (code === defaultLanguage) return
    setPublishedLanguages((prev) => {
      if (checked) return [...prev, code]
      return prev.filter((item) => item !== code)
    })
    if (checked) {
      const nextLocale = normalizeLocale(code)
      void translateTitleForTargets([nextLocale])
      copyPricingFromLanguage(normalizedDefaultLanguage, nextLocale)
    }
  }

  const updatePricingValue = (language: Locale, field: "currency" | "price_adult" | "price_child", value: string) => {
    setPricingValues((prev) => ({
      ...prev,
      [language]: {
        ...prev[language],
        [field]:
          field === "currency"
            ? normalizePackageCurrency(value)
            : normalizePackagePriceInput(value),
      },
    }))
  }

  const scheduleTitleAutoTranslate = (sourceValue: string, sourceLanguage: Locale) => {
    if (titleTranslationTimerRef.current) {
      clearTimeout(titleTranslationTimerRef.current)
    }

    if (!sourceValue.trim()) {
      setTitleValues((prev) => {
        const next = { ...prev }
        for (const language of titleTargetLanguages) {
          if (!manualTitleOverridesRef.current.has(language)) {
            next[language] = ""
          }
        }
        return next
      })
      return
    }

    titleTranslationTimerRef.current = setTimeout(async () => {
      try {
        const translations = await requestMerchantAutoTranslations({
          text: sourceValue,
          sourceLanguage,
          targetLanguages: titleTargetLanguages,
        })

        setTitleValues((prev) => {
          const next = { ...prev }
          for (const language of titleTargetLanguages) {
            if (!manualTitleOverridesRef.current.has(language) && typeof translations[language] === "string") {
              next[language] = translations[language] || ""
            }
          }
          return next
        })
      } catch (error) {
        console.error("edit step1 title auto translate error:", error)
      }
    }, 700)
  }

  useEffect(() => {
    const sourceValue = titleValues[normalizedDefaultLanguage]
    const pendingTargets = titleTargetLanguages.filter(
      (language) => !manualTitleOverridesRef.current.has(language) && !titleValues[language]?.trim(),
    )

    if (!sourceValue.trim() || pendingTargets.length === 0) return

    const timer = setTimeout(() => {
      void translateTitleForTargets(pendingTargets)
    }, 250)

    return () => clearTimeout(timer)
  }, [normalizedDefaultLanguage, titleTargetLanguages, titleValues, translateTitleForTargets])

  const updateTitleValue = (language: Locale, value: string) => {
    setTitleValues((prev) => ({
      ...prev,
      [language]: value,
    }))

    if (language !== normalizedDefaultLanguage) {
      manualTitleOverridesRef.current.add(language)
      return
    }

    scheduleTitleAutoTranslate(value, language)
  }

  const retranslateTitle = useCallback(async (language: Locale) => {
    const sourceValue = titleValues[normalizedDefaultLanguage]
    if (language === normalizedDefaultLanguage || !publishedLanguages.includes(language) || !sourceValue.trim()) return

    setIsRetranslatingTitle(true)
    try {
      const translations = await requestMerchantAutoTranslations({
        text: sourceValue,
        sourceLanguage: normalizedDefaultLanguage,
        targetLanguages: [language],
      })

      if (typeof translations[language] === "string") {
        setTitleValues((prev) => ({
          ...prev,
          [language]: translations[language] || "",
        }))
      }
    } catch (error) {
      console.error("edit step1 retranslate title error:", error)
    } finally {
      setIsRetranslatingTitle(false)
    }
  }, [normalizedDefaultLanguage, publishedLanguages, titleValues])

  return (
    <form action={updatePackageStep1} className="space-y-6">
      <input type="hidden" name="package_id" value={packageId} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">{t.packageName}</label>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {visibleLanguages.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => setActiveTitleLang(language.code)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    activeTitleLang === language.code
                      ? "bg-orange-500 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {language.label}
                </button>
              ))}
            </div>
            {visibleLanguages.map((language) => (
              <div key={language.code} className={activeTitleLang === language.code ? "block" : "hidden"}>
                {language.code !== normalizedDefaultLanguage && publishedLanguages.includes(language.code) && (
                  <div className="mb-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void retranslateTitle(language.code)}
                      disabled={isRetranslatingTitle}
                      className="rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRetranslatingTitle ? (t.retranslateInProgress || "Translating...") : (t.retranslate || "Retranslate")}
                    </button>
                  </div>
                )}
                <input
                  name={`title_${language.code}`}
                  value={titleValues[language.code]}
                  onChange={(event) => updateTitleValue(language.code, event.target.value)}
                  placeholder={t.packageNamePlaceholder}
                  className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
                  required={language.code === normalizedDefaultLanguage}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">{t.travelStyle}</label>
          <select
            name="travel_style"
            value={travelStyle}
            onChange={(event) => setTravelStyle(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          >
            <option value="">{t.selectTravelStyle}</option>
            {travelStyleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 pt-2 text-sm font-semibold text-slate-800">{t.departureSection}</div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{t.originCountry}</label>
          <select
            name="origin_country_id"
            defaultValue={initialData.origin_country_id}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          >
            <option value="">{t.selectOriginCountry}</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{t.originProvince}</label>
          <input
            name="origin_province"
            defaultValue={initialData.origin_province}
            placeholder={t.originProvincePlaceholder}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          />
        </div>

        <div className="md:col-span-2 pt-2 text-sm font-semibold text-slate-800">{t.destinationSection}</div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{t.destinationCountry}</label>
          <select
            name="destination_country_id"
            defaultValue={initialData.destination_country_id}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          >
            <option value="">{t.selectDestinationCountry}</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{t.destinationProvince}</label>
          <input
            name="destination_province"
            defaultValue={initialData.destination_province}
            placeholder={t.destinationProvincePlaceholder}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            {getParticipantFieldLabel(travelStyle, locale)}
          </label>
          <input
            name="minimal_peserta"
            type="number"
            min="1"
            defaultValue={initialData.minimal_peserta}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          />
          {isQuotaTravelStyle(travelStyle) && (
            <p className="mt-2 text-xs text-slate-500">
              {t.quotaHint}
            </p>
          )}
        </div>

        {isQuotaTravelStyle(travelStyle) && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t.departureDate}</label>
            <input
              name="departure_date"
              type="date"
              defaultValue={initialData.departure_date}
              className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
              required
            />
            <p className="mt-2 text-xs text-slate-500">
              {t.departureDateHint}
            </p>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{t.durationDays}</label>
          <input
            name="duration_days"
            type="number"
            min="1"
            defaultValue={initialData.duration}
            placeholder={t.durationPlaceholder}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          />
        </div>

        <div className="md:col-span-2 space-y-3">
          <label className="block text-sm font-medium text-slate-700">{t.merchantCurrency}</label>
          <div className="flex flex-wrap gap-2">
            {visibleLanguages.map((language) => (
              <button
                key={language.code}
                type="button"
                onClick={() => setActivePricingLang(language.code)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  activePricingLang === language.code
                    ? "bg-orange-500 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {language.label}
              </button>
            ))}
          </div>
          {visibleLanguages.map((language) => (
            <div
              key={language.code}
              className={activePricingLang === language.code ? "grid grid-cols-1 gap-4 md:grid-cols-3" : "hidden"}
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t.merchantCurrency}</label>
                <select
                  name={`currency_${language.code}`}
                  value={pricingValues[language.code].currency}
                  onChange={(event) => updatePricingValue(language.code, "currency", event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {packageCurrencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t.adultPrice}</label>
                <input
                  name={`price_adult_${language.code}`}
                  inputMode="numeric"
                  value={pricingValues[language.code].price_adult}
                  onChange={(event) => updatePricingValue(language.code, "price_adult", event.target.value)}
                  placeholder={t.adultPricePlaceholder}
                  className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t.childPrice}</label>
                <input
                  name={`price_child_${language.code}`}
                  inputMode="numeric"
                  value={pricingValues[language.code].price_child}
                  onChange={(event) => updatePricingValue(language.code, "price_child", event.target.value)}
                  placeholder={t.childPricePlaceholder}
                  className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">{t.defaultLanguage}</label>
          <select
            name="default_language"
            value={defaultLanguage}
            onChange={(event) => onDefaultLanguageChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          >
            {merchantWizardLanguageOptions.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-medium text-slate-700">{t.publishLanguage}</p>
          <p className="mb-3 text-xs text-slate-500">{t.publishLanguageHint}</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {merchantWizardLanguageOptions.map((language) => {
              const checked = publishedLanguages.includes(language.code)
              const isDefault = language.code === defaultLanguage
              return (
                <label
                  key={language.code}
                  className="flex items-center gap-2 rounded-xl border border-slate-300 p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    name="publish_languages[]"
                    value={language.code}
                    checked={checked}
                    disabled={isDefault}
                    onChange={(event) => onTogglePublishedLanguage(language.code, event.target.checked)}
                  />
                  <span>{language.label}</span>
                  {isDefault && (
                    <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{t.defaultBadge}</span>
                  )}
                </label>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
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
