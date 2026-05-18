"use client"

import { useState } from "react"
import type { Locale } from "@/lib/i18n"

function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M7 6h10a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8a2 2 0 0 1 2-2Z" />
      <path d="M12 8.5v7M12 10.5h.01M12 13.5h.01" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
      <path d="M8 3.5v4M16 3.5v4M4 9.5h16" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <circle cx="9" cy="8.5" r="2.5" />
      <circle cx="16" cy="9.5" r="2" />
      <path d="M4.5 17c.8-2.3 2.7-3.8 5.3-3.8 2.6 0 4.5 1.5 5.3 3.8" />
      <path d="M14 16.5c.5-1.5 1.8-2.5 3.7-2.5 1.2 0 2.2.3 3 .9" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  )
}

function StaticField({
  icon,
  label,
  value,
  sublabel,
  withLeftBorder = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel: string
  withLeftBorder?: boolean
}) {
  return (
    <div
      className={`relative flex min-w-0 items-center gap-3 px-3.5 py-3 md:px-4.5 ${
        withLeftBorder ? "border-t border-slate-100 xl:border-l xl:border-t-0" : "rounded-[22px]"
      }`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff3ee] text-[#ef4423] shadow-inner">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="block text-[11px] text-slate-500">{label}</p>
        <div className="mt-1 flex items-center gap-3 rounded-[12px] bg-transparent">
          <span className="min-w-0 flex-1 truncate pr-2 text-[15px] font-semibold leading-6 text-slate-950">{value}</span>
          <span className="shrink-0 text-slate-400">
            <ChevronIcon />
          </span>
        </div>
        <p className="mt-1 truncate text-[12px] text-slate-500">{sublabel}</p>
      </div>
    </div>
  )
}

export default function ActivitiesHeroSearchBar({ locale, buttonLabel }: { locale: Locale; buttonLabel: string }) {
  const [activityType, setActivityType] = useState<"attraction" | "tour" | "event">("attraction")
  const copy = {
    id: {
      attraction: "Atraksi",
      tour: "Tur",
      event: "Event",
      destination: "Destinasi",
      category: "Kategori",
      date: "Tanggal",
      tickets: "Tiket",
      destinationValue: activityType === "tour" ? "Great Wall Day Tour" : activityType === "event" ? "Universal Beijing Night Show" : "Shanghai Disneyland",
      destinationSub: activityType === "tour" ? "Beijing" : activityType === "event" ? "Beijing" : "Shanghai",
      categoryValue: activityType === "tour" ? "Private tour" : activityType === "event" ? "Live entertainment" : "Taman Hiburan",
      categorySub: activityType === "tour" ? "Guide included" : activityType === "event" ? "VIP" : "Atraksi populer",
      dateValue: "31 Mei 2026",
      dateSub: "Minggu",
      ticketsValue: "2 Dewasa",
      ticketsSub: activityType === "event" ? "VIP" : "Reguler",
    },
    en: {
      attraction: "Attractions",
      tour: "Tours",
      event: "Events",
      destination: "Destination",
      category: "Category",
      date: "Date",
      tickets: "Tickets",
      destinationValue: activityType === "tour" ? "Great Wall Day Tour" : activityType === "event" ? "Universal Beijing Night Show" : "Shanghai Disneyland",
      destinationSub: activityType === "tour" ? "Beijing" : activityType === "event" ? "Beijing" : "Shanghai",
      categoryValue: activityType === "tour" ? "Private tour" : activityType === "event" ? "Live entertainment" : "Theme Park",
      categorySub: activityType === "tour" ? "Guide included" : activityType === "event" ? "VIP" : "Popular attraction",
      dateValue: "May 31, 2026",
      dateSub: "Sunday",
      ticketsValue: "2 Adults",
      ticketsSub: activityType === "event" ? "VIP" : "Regular",
    },
    zh: {
      attraction: "景点",
      tour: "行程",
      event: "活动",
      destination: "目的地",
      category: "分类",
      date: "日期",
      tickets: "门票",
      destinationValue: activityType === "tour" ? "长城一日游" : activityType === "event" ? "北京环球夜间秀" : "上海迪士尼",
      destinationSub: activityType === "tour" ? "北京" : activityType === "event" ? "北京" : "上海",
      categoryValue: activityType === "tour" ? "私人行程" : activityType === "event" ? "现场演出" : "主题乐园",
      categorySub: activityType === "tour" ? "含导游" : activityType === "event" ? "VIP" : "热门景点",
      dateValue: "2026年5月31日",
      dateSub: "周日",
      ticketsValue: "2位成人",
      ticketsSub: activityType === "event" ? "VIP" : "普通票",
    },
  }[locale]

  const tabs = [
    { key: "attraction" as const, label: copy.attraction },
    { key: "tour" as const, label: copy.tour },
    { key: "event" as const, label: copy.event },
  ]

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto border-b border-[#edf1f5] px-2 py-1 text-sm font-medium text-slate-700 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const isActive = activityType === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActivityType(tab.key)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[12px] transition lg:border-b-[2px] lg:rounded-none lg:border-x-0 lg:border-t-0 lg:px-0 lg:py-[0.7rem] lg:text-[14px] ${
                isActive
                  ? "border-[#ef3b2d] bg-[#fff4f1] text-[#ef3b2d] lg:bg-transparent"
                  : "border-transparent bg-transparent text-[#53657e] hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.96fr)_minmax(0,0.9fr)_minmax(0,0.92fr)_56px]">
        <StaticField icon={<TicketIcon />} label={copy.destination} value={copy.destinationValue} sublabel={copy.destinationSub} />
        <StaticField icon={<UsersIcon />} label={copy.category} value={copy.categoryValue} sublabel={copy.categorySub} withLeftBorder />
        <StaticField icon={<CalendarIcon />} label={copy.date} value={copy.dateValue} sublabel={copy.dateSub} withLeftBorder />
        <StaticField icon={<UsersIcon />} label={copy.tickets} value={copy.ticketsValue} sublabel={copy.ticketsSub} withLeftBorder />
        <a
          href="/aktivitas/catalog#service-filter"
          aria-label={buttonLabel}
          className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff6541_0%,#ef4423_100%)] px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_18px_34px_-18px_rgba(239,68,35,0.82)] transition hover:brightness-105 xl:mt-1 xl:h-[56px] xl:w-[56px] xl:self-center xl:px-0 xl:py-0"
        >
          <SearchIcon />
        </a>
      </div>
    </div>
  )
}
