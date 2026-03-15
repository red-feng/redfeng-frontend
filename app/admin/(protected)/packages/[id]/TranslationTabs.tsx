"use client"

import { useState } from "react"

type TranslationItem = {
  language_code: string | null
  title: string | null
  about_tour: string | null
  service_standard: string | null
  include: string | null
  exclude: string | null
  preparation: string | null
  terms_conditions: string | null
  meeting_point: string | null
  highlights: string | null
}

function getLanguageLabel(code: string | null): string {
  if (code === "id") return "Indonesia"
  if (code === "en") return "English"
  if (code === "zh") return "Chinese"
  return code || "-"
}

export default function TranslationTabs({
  translations,
  defaultLanguage,
  fallbackTitle,
}: {
  translations: TranslationItem[]
  defaultLanguage: string | null
  fallbackTitle: string | null
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeTranslation = translations[activeIndex] || null

  if (translations.length === 0 || !activeTranslation) {
    return <p className="text-sm text-slate-500">Konten terjemahan belum tersedia.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {translations.map((translation, index) => (
          <button
            key={translation.language_code || `lang-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
              activeIndex === index
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600"
            }`}
          >
            {getLanguageLabel(translation.language_code)}
            {translation.language_code === defaultLanguage ? " - Default" : ""}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Judul Paket</h3>
          <p className="whitespace-pre-line">{activeTranslation.title || fallbackTitle || "-"}</p>
        </div>
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Info Tentang Tour</h3>
          <p className="whitespace-pre-line">{activeTranslation.about_tour || "-"}</p>
        </div>
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Meeting Point</h3>
          <p className="whitespace-pre-line">{activeTranslation.meeting_point || "-"}</p>
        </div>
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Standar Layanan Merchant</h3>
          <p className="whitespace-pre-line">{activeTranslation.service_standard || "-"}</p>
        </div>
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Yang Termasuk</h3>
          <p className="whitespace-pre-line">{activeTranslation.include || "-"}</p>
        </div>
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Yang Tidak Termasuk</h3>
          <p className="whitespace-pre-line">{activeTranslation.exclude || "-"}</p>
        </div>
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Tag / Sorotan</h3>
          <p className="whitespace-pre-line">{activeTranslation.highlights || "-"}</p>
        </div>
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Peralatan & Dokumen yang Disiapkan Peserta</h3>
          <p className="whitespace-pre-line">{activeTranslation.preparation || "-"}</p>
        </div>
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Syarat & Ketentuan saat di Lokasi</h3>
          <p className="whitespace-pre-line">{activeTranslation.terms_conditions || "-"}</p>
        </div>
      </div>
    </div>
  )
}
