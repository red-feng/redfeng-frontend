"use client"

import { useMemo, useState } from "react"
import { getFacilityLabel } from "@/lib/facility-labels"
import type { Locale } from "@/lib/i18n"

type TranslationRow = {
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

type FacilityItem = {
  id: string
  rawName: string
}

type TagItem = {
  id: string
  label: string
}

type ItineraryRouteItem = {
  id: string
  pickup_time: string | null
  route: string | null
  description: string | null
}

type ItineraryDayItem = {
  id: string
  day_number: number
  translations: Record<
    string,
    {
      title: string | null
      routes: ItineraryRouteItem[]
    }
  >
}

type DetailContent = {
  title: string
  about_tour: string | null
  meeting_point: string | null
  service_standard: string | null
  include: string | null
  exclude: string | null
  highlights: string | null
  preparation: string | null
  terms_conditions: string | null
  map_embed: string | null
}

type ReviewTabKey = "detail" | "facilities" | "tags" | "itinerary"

const TAB_ITEMS: Array<{ key: ReviewTabKey; label: string }> = [
  { key: "detail", label: "Detail Konten" },
  { key: "facilities", label: "Fasilitas" },
  { key: "tags", label: "Tag / Sorotan" },
  { key: "itinerary", label: "Itinerary" },
]

function getLanguageLabel(code: string | null): string {
  if (code === "id") return "Indonesia"
  if (code === "en") return "English"
  if (code === "zh") return "Chinese"
  return code || "-"
}

function toLocale(code: string | null | undefined): Locale {
  if (code === "en" || code === "zh") return code
  return "id"
}

function DetailBlock({ title, value }: { title: string; value: string | null | undefined }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="whitespace-pre-line text-sm leading-7 text-slate-700">{value || "-"}</p>
    </div>
  )
}

function LanguageTabs({
  languages,
  defaultLanguage,
  activeLanguage,
  onChange,
}: {
  languages: string[]
  defaultLanguage: string | null
  activeLanguage: string
  onChange: (language: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {languages.map((language) => {
        const isActive = activeLanguage === language
        return (
          <button
            key={language}
            type="button"
            onClick={() => onChange(language)}
            className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600"
            }`}
          >
            <span>{getLanguageLabel(language)}</span>
            {language === defaultLanguage && (
              <span className={`ml-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                isActive
                  ? "border-white/30 bg-white/15 text-white"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}>
                default
              </span>
            )}
            {language !== defaultLanguage && (
              <span className={`ml-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                isActive
                  ? "border-white/30 bg-white/15 text-white"
                  : "border-sky-200 bg-sky-50 text-sky-700"
              }`}>
                published
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function AdminPackageReviewTabs({
  detailContent,
  translations,
  defaultLanguage,
  publishedLanguages,
  fallbackTitle,
  facilities,
  tags,
  itineraryDays,
}: {
  detailContent: DetailContent
  translations: TranslationRow[]
  defaultLanguage: string | null
  publishedLanguages: string[]
  fallbackTitle: string | null
  facilities: FacilityItem[]
  tags: TagItem[]
  itineraryDays: ItineraryDayItem[]
}) {
  const [activeTab, setActiveTab] = useState<ReviewTabKey>("detail")
  const [activeLanguage, setActiveLanguage] = useState<string>(defaultLanguage || publishedLanguages[0] || "id")

  const availableLanguages = useMemo(
    () => [...new Set([defaultLanguage || "id", ...publishedLanguages])],
    [defaultLanguage, publishedLanguages],
  )

  const activeTranslation = useMemo(
    () =>
      translations.find((translation) => translation.language_code === activeLanguage) ||
      translations.find((translation) => translation.language_code === defaultLanguage) ||
      translations[0] ||
      null,
    [activeLanguage, defaultLanguage, translations],
  )

  const itineraryForLanguage = useMemo(() => {
    return itineraryDays.map((day) => ({
      id: day.id,
      day_number: day.day_number,
      title:
        day.translations[activeLanguage]?.title ||
        day.translations[defaultLanguage || "id"]?.title ||
        null,
      routes:
        day.translations[activeLanguage]?.routes ||
        day.translations[defaultLanguage || "id"]?.routes ||
        [],
    }))
  }, [activeLanguage, defaultLanguage, itineraryDays])

  const activeLocale = toLocale(activeLanguage)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <LanguageTabs
          languages={availableLanguages}
          defaultLanguage={defaultLanguage}
          activeLanguage={activeLanguage}
          onChange={setActiveLanguage}
        />
      </div>

      {activeTab === "detail" && (
        <div className="mt-5 space-y-5">
          <DetailBlock title="Judul Paket" value={activeTranslation?.title || fallbackTitle || detailContent.title} />
          <DetailBlock title="Info Tentang Tour" value={activeTranslation?.about_tour || detailContent.about_tour} />
          <DetailBlock title="Meeting Point" value={activeTranslation?.meeting_point || detailContent.meeting_point} />
          <DetailBlock
            title="Standar Layanan Merchant"
            value={activeTranslation?.service_standard || detailContent.service_standard}
          />
          <DetailBlock title="Yang Termasuk" value={activeTranslation?.include || detailContent.include} />
          <DetailBlock title="Yang Tidak Termasuk" value={activeTranslation?.exclude || detailContent.exclude} />
          <DetailBlock title="Tag / Sorotan" value={activeTranslation?.highlights || detailContent.highlights} />
          <DetailBlock
            title="Peralatan & Dokumen yang Disiapkan Peserta"
            value={activeTranslation?.preparation || detailContent.preparation}
          />
          <DetailBlock
            title="Syarat & Ketentuan saat di Lokasi"
            value={activeTranslation?.terms_conditions || detailContent.terms_conditions}
          />

          {detailContent.map_embed && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Preview Peta Titik Penjemputan</h3>
              <div
                className="overflow-hidden rounded-xl border border-slate-200"
                dangerouslySetInnerHTML={{ __html: detailContent.map_embed }}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "facilities" && (
        <div className="mt-5 flex flex-wrap gap-2">
          {facilities.length === 0 && <span className="text-sm text-slate-500">Tidak ada fasilitas.</span>}
          {facilities.map((facility) => (
            <span
              key={facility.id}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
            >
              {getFacilityLabel(facility.rawName, activeLocale)}
            </span>
          ))}
        </div>
      )}

      {activeTab === "tags" && (
        <div className="mt-5 space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Sorotan Bahasa {getLanguageLabel(activeLanguage)}</h3>
            <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
              {activeTranslation?.highlights || "-"}
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Tag Paket</h3>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 && <span className="text-sm text-slate-500">Tidak ada tag.</span>}
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-slate-900 px-3 py-1 text-sm font-medium text-white"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "itinerary" && (
        <div className="mt-5 space-y-5">
          {itineraryForLanguage.length === 0 && <p className="text-sm text-slate-500">Itinerary belum tersedia.</p>}
          {itineraryForLanguage.map((day) => (
            <div key={day.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-900">
                Hari {day.day_number}
                {day.title ? ` - ${day.title}` : ""}
              </h3>
              <div className="mt-3 space-y-3">
                {day.routes.map((route) => (
                  <div key={route.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-900">{route.pickup_time || "-"}</p>
                    <p className="mt-1 text-sm text-slate-700">{route.route || "-"}</p>
                    <p className="mt-1 text-sm text-slate-500">{route.description || "-"}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
