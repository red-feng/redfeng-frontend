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
  publishedLanguages = [],
}: {
  translations: TranslationItem[]
  defaultLanguage: string | null
  fallbackTitle: string | null
  publishedLanguages?: string[] | null
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeTranslation = translations[activeIndex] || null

  if (translations.length === 0 || !activeTranslation) {
    return <p className="text-sm text-slate-500">Konten terjemahan belum tersedia.</p>
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {translations.map((translation, index) => (
          <button
            key={translation.language_code || `lang-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`inline-flex w-full items-center justify-between gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition sm:w-auto sm:justify-start sm:rounded-full ${
              activeIndex === index
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-300 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600"
            }`}
          >
            <span>{getLanguageLabel(translation.language_code)}</span>
            {translation.language_code === defaultLanguage && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                activeIndex === index ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                default
              </span>
            )}
            {translation.language_code !== defaultLanguage &&
              publishedLanguages?.includes(translation.language_code || "") && (
                <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  activeIndex === index ? "bg-white/20 text-white" : "bg-orange-50 text-orange-600"
                }`}>
                  published
                </span>
              )}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 sm:p-5">
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
