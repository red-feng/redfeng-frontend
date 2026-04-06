"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPackage } from "./actions"
import Image from "next/image"
import { getParticipantFieldLabel, isQuotaTravelStyle, travelStyleOptions } from "@/lib/travelStyles"
import { getMerchantWizardText, merchantWizardLanguageOptions } from "@/lib/merchant-wizard-i18n"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { requestMerchantAutoTranslations } from "@/lib/merchant-auto-translation-client"
import { formatPackageMoney, localeCurrencyMap, normalizePackageCurrency, normalizePackagePriceInput, packageCurrencyOptions } from "@/lib/package-pricing"

type Country = {
  id: string
  name: string
}

export default function Step1Basic({
  countries,
  uiLocale = "id",
}: {
  countries: Country[]
  uiLocale?: string
}) {
  const [originCountry, setOriginCountry] = useState("")
  const [destinationCountry, setDestinationCountry] = useState("")
  const [defaultLanguage, setDefaultLanguage] = useState("id")
  const [publishedLanguages, setPublishedLanguages] = useState<string[]>(["id"])
  const [travelStyle, setTravelStyle] = useState("")
  const [activeTitleLang, setActiveTitleLang] = useState<Locale>("id")
  const [titleValues, setTitleValues] = useState<Record<Locale, string>>({
    id: "",
    en: "",
    zh: "",
  })
  const [baseCurrency, setBaseCurrency] = useState("IDR")
  const [baseAdultPrice, setBaseAdultPrice] = useState("")
  const [baseChildPrice, setBaseChildPrice] = useState("")
  const [pricingValues, setPricingValues] = useState<Record<Locale, { currency: string; price_adult: string; price_child: string }>>({
    id: { currency: "IDR", price_adult: "", price_child: "" },
    en: { currency: "USD", price_adult: "", price_child: "" },
    zh: { currency: "CNY", price_adult: "", price_child: "" },
  })
  const [ratesTimestamp, setRatesTimestamp] = useState<string | null>(null)
  const [isRetranslatingTitle, setIsRetranslatingTitle] = useState(false)
  const manualTitleOverridesRef = useRef<Set<Locale>>(new Set())
  const titleTranslationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const locale = normalizeLocale(uiLocale)
  const t = getMerchantWizardText(locale)
  const pricingText =
    locale === "en"
      ? {
          title: "Auto currency by published language",
          latestRate: "Latest rate",
          adult: "Adult",
          child: "Child",
          primary: "Primary source price.",
          auto: "This value is filled automatically from the latest exchange rate.",
        }
      : locale === "zh"
        ? {
            title: "按发布语言自动换算货币",
            latestRate: "最新汇率",
            adult: "成人",
            child: "儿童",
            primary: "主要来源价格。",
            auto: "此数值会根据最新汇率自动填充。",
          }
        : {
            title: "Auto currency per bahasa publish",
            latestRate: "Kurs terbaru",
            adult: "Dewasa",
            child: "Anak",
            primary: "Harga sumber utama.",
            auto: "Nilai ini terisi otomatis dari kurs terbaru.",
          };
  const mediaText =
    locale === "en"
      ? {
          coverTitle: "Cover image",
          coverHint: "Any image size can be uploaded, but customer pages use a landscape frame. Best result: 16:9 ratio, min 1600x900.",
          cropHint: "The system keeps layout safe, but very tall or very wide images may be cropped on cards and package detail pages.",
          cardPreview: "Homepage card preview",
          detailPreview: "Package detail preview",
        }
      : locale === "zh"
        ? {
            coverTitle: "封面图片",
            coverHint: "可上传任意尺寸图片，但客户页面会使用横向画框。建议比例 16:9，最低 1600x900。",
            cropHint: "系统会保证版面安全，但过高或过宽的图片在首页卡片和详情页中可能会被裁切。",
            cardPreview: "首页卡片预览",
            detailPreview: "详情页预览",
          }
        : {
            coverTitle: "Gambar cover",
            coverHint: "Merchant bisa upload ukuran apa pun, tetapi halaman customer memakai frame landscape. Hasil terbaik: rasio 16:9, minimal 1600x900.",
            cropHint: "Layout akan tetap aman, tetapi gambar yang terlalu tinggi atau terlalu lebar bisa terpotong di card halaman utama dan halaman detail paket.",
            cardPreview: "Preview card halaman utama",
            detailPreview: "Preview halaman detail paket",
          };
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
    const controller = new AbortController()
    const adultPrice = Number(baseAdultPrice || 0)
    const childPrice = Number(baseChildPrice || 0)

    const syncPricingPreview = async () => {
      try {
        const params = new URLSearchParams({
          baseLanguage: normalizedDefaultLanguage,
          baseCurrency,
          adultPrice: String(adultPrice),
          childPrice: String(childPrice),
        })
        const response = await fetch(`/api/currency-rates?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        })
        if (!response.ok) return

        const payload = (await response.json()) as {
          date?: string | null
          pricing?: Record<Locale, { currency: string; price_adult: number; price_child: number }>
        }

        if (!payload.pricing) return

        setPricingValues({
          id: {
            currency: payload.pricing.id?.currency || localeCurrencyMap.id,
            price_adult: String(payload.pricing.id?.price_adult ?? 0),
            price_child: String(payload.pricing.id?.price_child ?? 0),
          },
          en: {
            currency: payload.pricing.en?.currency || localeCurrencyMap.en,
            price_adult: String(payload.pricing.en?.price_adult ?? 0),
            price_child: String(payload.pricing.en?.price_child ?? 0),
          },
          zh: {
            currency: payload.pricing.zh?.currency || localeCurrencyMap.zh,
            price_adult: String(payload.pricing.zh?.price_adult ?? 0),
            price_child: String(payload.pricing.zh?.price_child ?? 0),
          },
        })
        setRatesTimestamp(payload.date || null)
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("sync pricing preview error:", error)
        }
      }
    }

    void syncPricingPreview()

    return () => controller.abort()
  }, [baseAdultPrice, baseChildPrice, baseCurrency, normalizedDefaultLanguage])

  const onDefaultLanguageChange = (nextDefault: string) => {
    setDefaultLanguage(nextDefault)
    setActiveTitleLang(normalizeLocale(nextDefault))
    setPublishedLanguages((prev) => {
      if (prev.includes(nextDefault)) return prev
      return [...prev, nextDefault]
    })
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
      console.error("step1 publish language auto translate error:", error)
    }
  }, [normalizedDefaultLanguage, titleValues])

  const onTogglePublishedLanguage = (code: string, checked: boolean) => {
    if (code === defaultLanguage) return
    setPublishedLanguages((prev) => {
      if (checked) return [...prev, code]
      return prev.filter((item) => item !== code)
    })
    if (checked) {
      void translateTitleForTargets([normalizeLocale(code)])
    }
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
        console.error("step1 title auto translate error:", error)
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
      console.error("step1 retranslate title error:", error)
    } finally {
      setIsRetranslatingTitle(false)
    }
  }, [normalizedDefaultLanguage, publishedLanguages, titleValues])

  return (
    <div className="relative min-h-screen">

      {/* BACKGROUND */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/bg-wizard.png')" }}
      />

      <div className="relative z-10">

        {/* HEADER LOGO */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <Image
            src="/logo-redfeng.png"
            alt="Red Feng"
            width={0}
            height={0}
            sizes="100vw"
            className="h-20 w-auto sm:h-24 lg:h-32"
            priority
          />
        </div>
          {/* CONTENT WRAPPER */}
        <div className="flex justify-center px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8 lg:pb-28">

          <div className="w-full max-w-5xl rounded-[28px] bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] sm:rounded-3xl sm:p-8 lg:p-14">

            <h1 className="mb-1 text-xl font-bold sm:text-2xl">
              {t.createPackageTitle}
            </h1>

            <p className="mb-6 text-sm text-gray-500 sm:mb-8 sm:text-base">
               {t.basicInfoStep}
            </p>

            <form
              action={createPackage}
              encType="multipart/form-data"
              className="space-y-6"
            >

             <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

  {/* DEFAULT LANGUAGE */}
  <div className="col-span-2">
    <p className="mb-2 text-sm font-semibold text-slate-700">{t.defaultLanguage}</p>
    <select
      name="default_language"
      className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
      value={defaultLanguage}
      onChange={(e) => onDefaultLanguageChange(e.target.value)}
      required
    >
      {merchantWizardLanguageOptions.map((language) => (
        <option key={language.code} value={language.code}>
          {language.label}
        </option>
      ))}
    </select>
  </div>

  <div className="col-span-2">
    <p className="mb-2 text-sm font-semibold text-slate-700">{t.publishLanguage}</p>
    <p className="mb-3 text-xs text-slate-500">
      {t.publishLanguageHint}
    </p>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {merchantWizardLanguageOptions.map((language) => {
        const checked = publishedLanguages.includes(language.code)
        const isDefault = language.code === defaultLanguage

        return (
          <label
            key={language.code}
            className="flex items-center gap-2 rounded-lg border border-slate-300 p-2 text-sm"
          >
            <input
              type="checkbox"
              name="publish_languages[]"
              value={language.code}
              checked={checked}
              disabled={isDefault}
              onChange={(e) => onTogglePublishedLanguage(language.code, e.target.checked)}
            />
            <span>{language.label}</span>
            {isDefault && (
              <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                {t.defaultBadge}
              </span>
            )}
          </label>
        )
      })}
    </div>
  </div>

  {/* NAMA PAKET */}
  <div className="col-span-2 space-y-3">
    <label className="block text-sm font-semibold text-slate-700">
      {t.packageName}
    </label>
    <div className="flex flex-wrap gap-2">
      {visibleLanguages.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => setActiveTitleLang(language.code)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
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
          className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
          required={language.code === normalizedDefaultLanguage}
        />
      </div>
    ))}
  </div>

  {/* TRAVEL STYLE */}
  <select
    name="travel_style"
    value={travelStyle}
    onChange={(event) => setTravelStyle(event.target.value)}
    className="border rounded-lg p-3 w-full col-span-2 outline-none focus:ring-2 focus:ring-blue-400"
    required
  >
    <option value="">{t.selectTravelStyle}</option>
    {travelStyleOptions.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>

  {/* ===== ORIGIN ===== */}
  <div className="col-span-2 font-semibold pt-2">
    {t.departureSection}
  </div>

  <select
  name="origin_country_id"
  value={originCountry}
  onChange={(e) => setOriginCountry(e.target.value)}
  className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
  required
>
  <option value="">{t.selectOriginCountry}</option>
  {countries.map(c => (
    <option key={c.id} value={c.id}>{c.name}</option>
  ))}
</select>

<input
  name="origin_province"
  placeholder={t.originProvincePlaceholder}
  className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
  required
/>

  {/* ===== DESTINATION ===== */}
<div className="col-span-2 font-semibold pt-6">
  {t.destinationSection}
</div>

<select
  name="destination_country_id"
  value={destinationCountry}
  onChange={(e) => setDestinationCountry(e.target.value)}
  className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
  required
>
  <option value="">{t.selectDestinationCountry}</option>
  {countries.map((c) => (
    <option key={c.id} value={c.id}>
      {c.name}
    </option>
  ))}
</select>

<input
  name="destination_province"
  placeholder={t.destinationProvincePlaceholder}
  className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
  required
/>

  <div className="md:col-span-1">
      <label className="mb-2 block text-sm font-semibold text-slate-700">
      {getParticipantFieldLabel(travelStyle, locale)}
      </label>
    <input
      name="minimal_peserta"
      type="number"
      min="1"
      placeholder={getParticipantFieldLabel(travelStyle, locale)}
      className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
      required
    />
    {isQuotaTravelStyle(travelStyle) && (
      <p className="mt-2 text-xs text-slate-500">
        {t.quotaHint}
      </p>
    )}
  </div>

  {isQuotaTravelStyle(travelStyle) && (
    <div className="md:col-span-1">
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {t.departureDate}
      </label>
      <input
        name="departure_date"
        type="date"
        className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
        required
      />
      <p className="mt-2 text-xs text-slate-500">
        {t.departureDateHint}
      </p>
    </div>
  )}

  {/* DURASI */}
  <div className="md:col-span-1">
    <label className="mb-2 block text-sm font-semibold text-slate-700">
      {t.durationDays}
    </label>
    <input
      name="duration_days"
      type="number"
      placeholder={t.durationPlaceholder}
      className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
      required
    />
  </div>

  <div className="col-span-2 space-y-3">
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          {t.merchantCurrency}
        </label>
        <select
          name="base_currency"
          value={baseCurrency}
          onChange={(event) => setBaseCurrency(normalizePackageCurrency(event.target.value))}
          className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
        >
          {packageCurrencyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          {t.adultPrice}
        </label>
        <input
          name="base_price_adult"
          inputMode="numeric"
          value={baseAdultPrice}
          onChange={(event) => setBaseAdultPrice(normalizePackagePriceInput(event.target.value))}
          placeholder={t.adultPricePlaceholder}
          className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
          required
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          {t.childPrice}
        </label>
        <input
          name="base_price_child"
          inputMode="numeric"
          value={baseChildPrice}
          onChange={(event) => setBaseChildPrice(normalizePackagePriceInput(event.target.value))}
          placeholder={t.childPricePlaceholder}
          className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-700">
          {pricingText.title}
        </p>
        {ratesTimestamp && (
          <p className="text-xs text-slate-500">
            {pricingText.latestRate}: {ratesTimestamp}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {visibleLanguages.map((language) => {
          const isDefaultPricingLanguage = language.code === normalizedDefaultLanguage
          return (
            <div key={language.code} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{language.label}</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                  {pricingValues[language.code].currency || localeCurrencyMap[language.code]}
                </span>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <p>
                  {pricingText.adult}:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatPackageMoney(
                      Number(pricingValues[language.code].price_adult || 0),
                      pricingValues[language.code].currency || localeCurrencyMap[language.code],
                      locale,
                    )}
                  </span>
                </p>
                <p>
                  {pricingText.child}:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatPackageMoney(
                      Number(pricingValues[language.code].price_child || 0),
                      pricingValues[language.code].currency || localeCurrencyMap[language.code],
                      locale,
                    )}
                  </span>
                </p>
                <p className="pt-1 text-xs text-slate-500">
                  {isDefaultPricingLanguage
                    ? pricingText.primary
                    : pricingText.auto}
                </p>
              </div>
              <input type="hidden" name={`currency_${language.code}`} value={pricingValues[language.code].currency || localeCurrencyMap[language.code]} />
              {!isDefaultPricingLanguage && (
                <>
                  <input type="hidden" name={`price_adult_${language.code}`} value={pricingValues[language.code].price_adult || "0"} />
                  <input type="hidden" name={`price_child_${language.code}`} value={pricingValues[language.code].price_child || "0"} />
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">{mediaText.coverTitle}</label>
                    <input
                      type="file"
                      name="cover_image"
                      accept="image/*"
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-white p-4"
                    />
                    <p className="mt-2 text-xs leading-6 text-slate-500">{mediaText.coverHint}</p>
                    <p className="mt-1 text-xs leading-6 text-slate-500">{mediaText.cropHint}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {mediaText.cardPreview}
                      </p>
                      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#fed7aa_0%,#fdba74_100%)]">
                        <div className="h-24 w-full bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,rgba(15,23,42,0.08)_100%)]" />
                        <div className="space-y-2 p-3">
                          <div className="h-3 w-3/4 rounded-full bg-slate-200" />
                          <div className="h-2.5 w-1/2 rounded-full bg-slate-100" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {mediaText.detailPreview}
                      </p>
                      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#fdba74_0%,#fb923c_100%)]">
                        <div className="h-28 w-full bg-[linear-gradient(135deg,rgba(255,255,255,0.10)_0%,rgba(15,23,42,0.10)_100%)]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              </div>

              <div className="flex justify-center pt-4 sm:pt-6">
                <button
                  type="submit"
                  className="w-full rounded-xl px-6 py-3 font-semibold sm:w-auto sm:px-12
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
