"use client"

import { useState } from "react"
import { createPackage } from "./actions"
import Image from "next/image"
import { getParticipantFieldLabel, isQuotaTravelStyle, travelStyleOptions } from "@/lib/travelStyles"
import { getMerchantWizardText, merchantWizardLanguageOptions } from "@/lib/merchant-wizard-i18n"
import { normalizeLocale } from "@/lib/i18n"

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
  const locale = normalizeLocale(uiLocale)
  const t = getMerchantWizardText(locale)

  const onDefaultLanguageChange = (nextDefault: string) => {
    setDefaultLanguage(nextDefault)
    setPublishedLanguages((prev) => {
      if (prev.includes(nextDefault)) return prev
      return [...prev, nextDefault]
    })
  }

  const onTogglePublishedLanguage = (code: string, checked: boolean) => {
    if (code === defaultLanguage) return
    setPublishedLanguages((prev) => {
      if (checked) return [...prev, code]
      return prev.filter((item) => item !== code)
    })
  }

  return (
    <div className="relative min-h-screen">

      {/* BACKGROUND */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/bg-wizard.png')" }}
      />

      <div className="relative z-10">

        {/* HEADER LOGO */}
        <div className="px-8 py-6">
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
          {/* CONTENT WRAPPER */}
        <div className="flex justify-center px-8 pb-28">

          <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-14">

            <h1 className="text-2xl font-bold mb-1">
              {t.createPackageTitle}
            </h1>

            <p className="text-gray-500 mb-8">
               {t.basicInfoStep}
            </p>

            <form
              action={createPackage}
              encType="multipart/form-data"
              className="space-y-6"
            >

             <div className="grid grid-cols-2 gap-4">

  {/* NAMA PAKET */}
  <input
    name="title"
    placeholder={t.packageNamePlaceholder}
    className="border rounded-lg p-3 w-full col-span-2 outline-none focus:ring-2 focus:ring-blue-400"
    required
  />

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

  {/* MATA UANG MERCHANT */}
  <div className="col-span-2">
    <p className="mb-2 text-sm font-semibold text-slate-700">{t.merchantCurrency}</p>
    <select
      name="currency"
      defaultValue="IDR"
      className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
    >
      <option value="IDR">IDR</option>
      <option value="USD">USD</option>
      <option value="CNY">CNY</option>
    </select>
  </div>

  <div>
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
    <div>
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
  <div>
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

  {/* HARGA DEWASA */}
  <div>
    <label className="mb-2 block text-sm font-semibold text-slate-700">
      {t.adultPrice}
    </label>
    <input
      name="price_adult"
      type="number"
      placeholder={t.adultPricePlaceholder}
      className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
      required
    />
  </div>

  {/* HARGA ANAK */}
  <div>
    <label className="mb-2 block text-sm font-semibold text-slate-700">
      {t.childPrice}
    </label>
    <input
      name="price_child"
      type="number"
      placeholder={t.childPricePlaceholder}
      className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
    />
  </div>

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
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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

</div>
<input
  type="file"
  name="cover_image"
  accept="image/*"
  required
/>
              <div className="flex justify-center pt-6">
                <button
                  type="submit"
                  className="px-12 py-3 rounded-xl font-semibold 
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
