"use client"

import { useMemo, useState } from "react"
import { getFacilityIcon } from "@/lib/facility-icons"
import { dictionaries, type Locale } from "@/lib/i18n"

type FacilityItem = {
  id: string
  name: string
}

type TagItem = {
  id: string
  tag: string
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
  day_title?: string | null
  routes: ItineraryRouteItem[]
}

type ContentData = {
  aboutTour: string | null
  serviceStandard: string | null
  include: string | null
  exclude: string | null
  meetingPoint: string | null
  mapEmbed: string | null
  facilities: FacilityItem[]
  tags: TagItem[]
  itineraryDays: ItineraryDayItem[]
}

type TabKey = "about" | "itinerary" | "facilities" | "service"

const TAB_ITEMS: { key: TabKey }[] = [
  { key: "about" },
  { key: "itinerary" },
  { key: "facilities" },
  { key: "service" },
]

export default function PackageTabs({
  data,
  locale,
}: {
  data: ContentData
  locale: Locale
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("about")
  const t = dictionaries[locale].tabs

  const activeTabLabel = useMemo(
    () => {
      if (activeTab === "about") return t.infoTour
      if (activeTab === "itinerary") return t.itinerary
      if (activeTab === "facilities") return t.facilities
      return t.standardService
    },
    [activeTab, t]
  )

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#fff7ed_100%)] p-4 md:p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Package Experience</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{activeTabLabel}</h2>
          </div>
          <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            {t.packageDetail}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "border-orange-200 bg-[linear-gradient(135deg,#ffedd5_0%,#fed7aa_100%)] text-orange-700 shadow-[0_12px_28px_rgba(249,115,22,0.18)]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50/70 hover:text-orange-600"
              }`}
            >
              {tab.key === "about"
                ? t.infoTour
                : tab.key === "itinerary"
                  ? t.itinerary
                  : tab.key === "facilities"
                    ? t.facilities
                    : t.standardService}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 md:p-7">

        {activeTab === "about" && (
          <div className="grid gap-4 text-sm leading-7 text-slate-700 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 md:col-span-2">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t.aboutTour}</h3>
              <p className="whitespace-pre-line">{data.aboutTour || "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t.meetingPoint}</h3>
              <p className="whitespace-pre-line">{data.meetingPoint || "-"}</p>
            </div>
            {data.tags.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t.highlights}</h3>
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
                    >
                      {tag.tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.mapEmbed && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 md:col-span-2">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t.map}</h3>
                <div
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  dangerouslySetInnerHTML={{ __html: data.mapEmbed }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "facilities" && (
          <div className="space-y-4">
            {data.facilities.length === 0 && (
              <p className="text-sm text-slate-500">{t.noFacilities}</p>
            )}
            <div className="flex flex-wrap gap-3">
              {data.facilities.map((facility) => (
                <span
                  key={facility.id}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 shadow-sm"
                >
                  <span>{getFacilityIcon(facility.name)}</span>
                  {facility.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {activeTab === "service" && (
          <div className="grid gap-4 text-sm leading-7 text-slate-700 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t.service}</h3>
              <p className="whitespace-pre-line">{data.serviceStandard || "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t.include}</h3>
              <p className="whitespace-pre-line">{data.include || "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 md:col-span-2">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t.exclude}</h3>
              <p className="whitespace-pre-line">{data.exclude || "-"}</p>
            </div>
          </div>
        )}

        {activeTab === "itinerary" && (
          <div className="space-y-5">
            {data.itineraryDays.length === 0 && (
              <p className="text-sm text-slate-500">{t.noItinerary}</p>
            )}
            {data.itineraryDays.map((day) => (
              <div key={day.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50/70">
                <div className="border-b border-slate-200 bg-white px-5 py-4">
                  <h3 className="text-base font-semibold text-slate-900">
                  {t.dayLabel} {day.day_number}{day.day_title ? ` - ${day.day_title}` : ""}
                  </h3>
                </div>
                <div className="space-y-3 p-4">
                  {day.routes.length === 0 && (
                    <p className="text-sm text-slate-500">{t.noRoute}</p>
                  )}
                  {day.routes.map((route) => (
                    <div key={route.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">{route.pickup_time || "-"}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{route.route || "-"}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{route.description || "-"}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
