"use client"

import { useMemo, useState } from "react"

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
  routes: ItineraryRouteItem[]
}

type ContentData = {
  aboutTour: string | null
  serviceStandard: string | null
  include: string | null
  exclude: string | null
  preparation: string | null
  termsConditions: string | null
  meetingPoint: string | null
  mapEmbed: string | null
  facilities: FacilityItem[]
  tags: TagItem[]
  itineraryDays: ItineraryDayItem[]
}

type TabKey = "about" | "itinerary" | "facilities" | "service"

const TAB_ITEMS: { key: TabKey; label: string }[] = [
  { key: "about", label: "Info Tour" },
  { key: "itinerary", label: "Itinerary" },
  { key: "facilities", label: "Fasilitas" },
  { key: "service", label: "Standar Layanan" },
]

export default function PackageTabs({ data }: { data: ContentData }) {
  const [activeTab, setActiveTab] = useState<TabKey>("about")

  const activeTabLabel = useMemo(
    () => TAB_ITEMS.find((item) => item.key === activeTab)?.label || "Info Tour",
    [activeTab]
  )

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-3 md:p-4">
        <div className="flex flex-wrap gap-2">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{activeTabLabel}</h2>
          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            Detail Paket
          </span>
        </div>

        {activeTab === "about" && (
          <div className="space-y-5 text-sm leading-7 text-slate-700">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">Tentang Tour</h3>
              <p className="whitespace-pre-line">{data.aboutTour || "-"}</p>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">Meeting Point</h3>
              <p className="whitespace-pre-line">{data.meetingPoint || "-"}</p>
            </div>
            {data.tags.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Highlights</h3>
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                    >
                      {tag.tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.mapEmbed && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Map</h3>
                <div
                  className="overflow-hidden rounded-xl border border-slate-200"
                  dangerouslySetInnerHTML={{ __html: data.mapEmbed }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "facilities" && (
          <div className="space-y-4">
            {data.facilities.length === 0 && (
              <p className="text-sm text-slate-500">Tidak ada fasilitas.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {data.facilities.map((facility) => (
                <span
                  key={facility.id}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                >
                  {facility.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {activeTab === "service" && (
          <div className="grid gap-5 text-sm leading-7 text-slate-700 md:grid-cols-2">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">Standar Layanan</h3>
              <p className="whitespace-pre-line">{data.serviceStandard || "-"}</p>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">Include</h3>
              <p className="whitespace-pre-line">{data.include || "-"}</p>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">Exclude</h3>
              <p className="whitespace-pre-line">{data.exclude || "-"}</p>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">Persiapan</h3>
              <p className="whitespace-pre-line">{data.preparation || "-"}</p>
            </div>
            <div className="md:col-span-2">
              <h3 className="mb-1 text-sm font-semibold text-slate-900">Syarat & Ketentuan</h3>
              <p className="whitespace-pre-line">{data.termsConditions || "-"}</p>
            </div>
          </div>
        )}

        {activeTab === "itinerary" && (
          <div className="space-y-5">
            {data.itineraryDays.length === 0 && (
              <p className="text-sm text-slate-500">Itinerary belum tersedia.</p>
            )}
            {data.itineraryDays.map((day) => (
              <div key={day.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-semibold text-slate-900">Hari {day.day_number}</h3>
                <div className="mt-3 space-y-3">
                  {day.routes.length === 0 && (
                    <p className="text-sm text-slate-500">Rute belum tersedia.</p>
                  )}
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
      </div>
    </section>
  )
}
