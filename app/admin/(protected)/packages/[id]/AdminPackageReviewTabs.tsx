"use client"

import { useMemo, useState } from "react"
import TranslationTabs from "./TranslationTabs"

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
  label: string
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
  title: string | null
  routes: ItineraryRouteItem[]
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

type ReviewTabKey = "detail" | "facilities" | "tags" | "itinerary" | "translator"

const TAB_ITEMS: Array<{ key: ReviewTabKey; label: string }> = [
  { key: "detail", label: "Detail Konten" },
  { key: "facilities", label: "Fasilitas" },
  { key: "tags", label: "Tag / Sorotan" },
  { key: "itinerary", label: "Itinerary" },
  { key: "translator", label: "Penerjemah" },
]

function DetailBlock({ title, value }: { title: string; value: string | null | undefined }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="whitespace-pre-line text-sm leading-7 text-slate-700">{value || "-"}</p>
    </div>
  )
}

export default function AdminPackageReviewTabs({
  detailContent,
  translations,
  defaultLanguage,
  fallbackTitle,
  facilities,
  tags,
  itineraryDays,
}: {
  detailContent: DetailContent
  translations: TranslationRow[]
  defaultLanguage: string | null
  fallbackTitle: string | null
  facilities: FacilityItem[]
  tags: TagItem[]
  itineraryDays: ItineraryDayItem[]
}) {
  const [activeTab, setActiveTab] = useState<ReviewTabKey>("detail")

  const hasTranslatedHighlights = useMemo(
    () => translations.some((translation) => Boolean(translation.highlights)),
    [translations],
  )

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

      {activeTab === "detail" && (
        <div className="mt-5 space-y-5">
          <DetailBlock title="Judul Paket" value={detailContent.title} />
          <DetailBlock title="Info Tentang Tour" value={detailContent.about_tour} />
          <DetailBlock title="Meeting Point" value={detailContent.meeting_point} />
          <DetailBlock title="Standar Layanan Merchant" value={detailContent.service_standard} />
          <DetailBlock title="Yang Termasuk" value={detailContent.include} />
          <DetailBlock title="Yang Tidak Termasuk" value={detailContent.exclude} />
          <DetailBlock title="Tag / Sorotan" value={detailContent.highlights} />
          <DetailBlock title="Peralatan & Dokumen yang Disiapkan Peserta" value={detailContent.preparation} />
          <DetailBlock title="Syarat & Ketentuan saat di Lokasi" value={detailContent.terms_conditions} />

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
              {facility.label}
            </span>
          ))}
        </div>
      )}

      {activeTab === "tags" && (
        <div className="mt-5 space-y-5">
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

          {hasTranslatedHighlights && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Sorotan hasil terjemahan merchant tersedia di tab <strong>Penerjemah</strong>.
            </div>
          )}
        </div>
      )}

      {activeTab === "itinerary" && (
        <div className="mt-5 space-y-5">
          {itineraryDays.length === 0 && <p className="text-sm text-slate-500">Itinerary belum tersedia.</p>}
          {itineraryDays.map((day) => (
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

      {activeTab === "translator" && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
            Isi review admin merupakan cerminan langsung dari paket yang diunggah merchant pada setiap bahasa.
          </div>
          <TranslationTabs
            translations={translations}
            defaultLanguage={defaultLanguage}
            fallbackTitle={fallbackTitle}
          />
        </div>
      )}
    </section>
  )
}
