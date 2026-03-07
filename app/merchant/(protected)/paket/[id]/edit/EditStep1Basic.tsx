"use client"

import { useState } from "react"
import { updatePackageStep1 } from "../../actions"
import { travelStyleOptions } from "@/lib/travelStyles"

type Country = {
  id: string
  name: string
}

type Step1InitialData = {
  title: string
  travel_style: string
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
}

export default function EditStep1Basic({
  packageId,
  countries,
  initialData,
}: {
  packageId: string
  countries: Country[]
  initialData: Step1InitialData
}) {
  const [defaultLanguage, setDefaultLanguage] = useState(initialData.default_language || "id")
  const [publishedLanguages, setPublishedLanguages] = useState<string[]>(
    initialData.published_languages.length > 0 ? initialData.published_languages : [initialData.default_language || "id"],
  )

  const languageOptions = [
    { code: "id", label: "Bahasa Indonesia" },
    { code: "en", label: "English" },
    { code: "zh", label: "Chinese" },
    { code: "th", label: "Thai" },
  ]

  const onDefaultLanguageChange = (nextDefault: string) => {
    setDefaultLanguage(nextDefault)
    setPublishedLanguages((prev) => (prev.includes(nextDefault) ? prev : [...prev, nextDefault]))
  }

  const onTogglePublishedLanguage = (code: string, checked: boolean) => {
    if (code === defaultLanguage) return
    setPublishedLanguages((prev) => {
      if (checked) return [...prev, code]
      return prev.filter((item) => item !== code)
    })
  }

  return (
    <form action={updatePackageStep1} className="space-y-6">
      <input type="hidden" name="package_id" value={packageId} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">Nama Paket</label>
          <input
            name="title"
            defaultValue={initialData.title}
            placeholder="Nama Paket"
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">Travel Style</label>
          <select
            name="travel_style"
            defaultValue={initialData.travel_style}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          >
            <option value="">Pilih Travel Style</option>
            {travelStyleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 pt-2 text-sm font-semibold text-slate-800">Keberangkatan</div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Negara Keberangkatan</label>
          <select
            name="origin_country_id"
            defaultValue={initialData.origin_country_id}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          >
            <option value="">Pilih Negara Keberangkatan</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Provinsi Keberangkatan</label>
          <input
            name="origin_province"
            defaultValue={initialData.origin_province}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          />
        </div>

        <div className="md:col-span-2 pt-2 text-sm font-semibold text-slate-800">Tujuan</div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Negara Tujuan</label>
          <select
            name="destination_country_id"
            defaultValue={initialData.destination_country_id}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          >
            <option value="">Pilih Negara Tujuan</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Provinsi Tujuan</label>
          <input
            name="destination_province"
            defaultValue={initialData.destination_province}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Mata Uang Merchant</label>
          <select
            name="currency"
            defaultValue={initialData.currency || "IDR"}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="IDR">IDR</option>
            <option value="USD">USD</option>
            <option value="CNY">CNY</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Minimal Peserta</label>
          <input
            name="minimal_peserta"
            type="number"
            min="1"
            defaultValue={initialData.minimal_peserta}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Durasi (hari)</label>
          <input
            name="duration_days"
            type="number"
            min="1"
            defaultValue={initialData.duration}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Harga Dewasa</label>
          <input
            name="price_adult"
            type="number"
            min="0"
            defaultValue={initialData.price_adult}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Harga Anak</label>
          <input
            name="price_child"
            type="number"
            min="0"
            defaultValue={initialData.price_child}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">Bahasa Default Merchant</label>
          <select
            name="default_language"
            value={defaultLanguage}
            onChange={(event) => onDefaultLanguageChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-400"
            required
          >
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English</option>
            <option value="zh">Chinese</option>
            <option value="th">Thai</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-medium text-slate-700">Bahasa Publish</p>
          <p className="mb-3 text-xs text-slate-500">Paket akan tampil di pilihan bahasa yang dicentang.</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {languageOptions.map((language) => {
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
                    <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">default</span>
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
          Simpan & Lanjut
        </button>
      </div>
    </form>
  )
}
