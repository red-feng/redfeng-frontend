"use client"

import { useState } from "react"
import type { Locale } from "@/lib/i18n"

function CruiseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M12 4v7m0-7 4 3m-4-3-4 3" />
      <path d="M4 14.5 12 18l8-3.5M6 16.5c.7 1.5 2 2.5 3.8 2.5 1 0 1.8-.2 2.2-.5.4.3 1.2.5 2.2.5 1.8 0 3.1-1 3.8-2.5" />
      <path d="M8 10.5h8" />
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

export default function CruiseHeroSearchBar({ locale, buttonLabel }: { locale: Locale; buttonLabel: string }) {
  const [cruiseType, setCruiseType] = useState<"regular" | "luxury" | "family">("regular")
  const copy = {
    id: {
      regular: "Regular Cruise",
      luxury: "Luxury Cruise",
      family: "Family Cruise",
      route: "Rute Cruise",
      cabin: "Cabin",
      departure: "Keberangkatan",
      guests: "Penumpang",
      routeValue:
        cruiseType === "luxury"
          ? "Shanghai - Jeju - Fukuoka"
          : cruiseType === "family"
            ? "Singapore - Port Klang"
            : "Singapore - Penang - Phuket",
      routeSub:
        cruiseType === "luxury"
          ? "5 malam"
          : cruiseType === "family"
            ? "Weekend cruise"
            : "3 malam",
      cabinValue:
        cruiseType === "luxury"
          ? "Balcony Suite"
          : cruiseType === "family"
            ? "Family Cabin"
            : "Ocean View",
      cabinSub:
        cruiseType === "luxury"
          ? "Luxury deck"
          : cruiseType === "family"
            ? "2 Dewasa, 2 Anak"
            : "2 Dewasa",
      departureValue: "12 Juni 2026",
      departureSub: "Jumat",
      guestsValue:
        cruiseType === "family"
          ? "4 Penumpang"
          : "2 Penumpang",
      guestsSub:
        cruiseType === "luxury"
          ? "Suite cabin"
          : cruiseType === "family"
            ? "Family package"
            : "Cabin twin",
    },
    en: {
      regular: "Regular Cruise",
      luxury: "Luxury Cruise",
      family: "Family Cruise",
      route: "Cruise Route",
      cabin: "Cabin",
      departure: "Departure",
      guests: "Passengers",
      routeValue:
        cruiseType === "luxury"
          ? "Shanghai - Jeju - Fukuoka"
          : cruiseType === "family"
            ? "Singapore - Port Klang"
            : "Singapore - Penang - Phuket",
      routeSub:
        cruiseType === "luxury"
          ? "5 nights"
          : cruiseType === "family"
            ? "Weekend cruise"
            : "3 nights",
      cabinValue:
        cruiseType === "luxury"
          ? "Balcony Suite"
          : cruiseType === "family"
            ? "Family Cabin"
            : "Ocean View",
      cabinSub:
        cruiseType === "luxury"
          ? "Luxury deck"
          : cruiseType === "family"
            ? "2 Adults, 2 Children"
            : "2 Adults",
      departureValue: "June 12, 2026",
      departureSub: "Friday",
      guestsValue: cruiseType === "family" ? "4 Passengers" : "2 Passengers",
      guestsSub:
        cruiseType === "luxury"
          ? "Suite cabin"
          : cruiseType === "family"
            ? "Family package"
            : "Cabin twin",
    },
    zh: {
      regular: "标准邮轮",
      luxury: "豪华邮轮",
      family: "家庭邮轮",
      route: "邮轮航线",
      cabin: "舱房",
      departure: "出发日期",
      guests: "乘客",
      routeValue:
        cruiseType === "luxury"
          ? "上海 - 济州 - 福冈"
          : cruiseType === "family"
            ? "新加坡 - 巴生港"
            : "新加坡 - 槟城 - 普吉",
      routeSub:
        cruiseType === "luxury"
          ? "5晚"
          : cruiseType === "family"
            ? "周末航线"
            : "3晚",
      cabinValue:
        cruiseType === "luxury"
          ? "阳台套房"
          : cruiseType === "family"
            ? "家庭舱"
            : "海景舱",
      cabinSub:
        cruiseType === "luxury"
          ? "豪华甲板"
          : cruiseType === "family"
            ? "2位成人，2位儿童"
            : "2位成人",
      departureValue: "2026年6月12日",
      departureSub: "周五",
      guestsValue: cruiseType === "family" ? "4位乘客" : "2位乘客",
      guestsSub:
        cruiseType === "luxury"
          ? "套房舱"
          : cruiseType === "family"
            ? "家庭套餐"
            : "双床舱房",
    },
  }[locale]

  const tabs = [
    { key: "regular" as const, label: copy.regular },
    { key: "luxury" as const, label: copy.luxury },
    { key: "family" as const, label: copy.family },
  ]

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto border-b border-[#edf1f5] px-2 py-1 text-sm font-medium text-slate-700 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const isActive = cruiseType === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCruiseType(tab.key)}
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

      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)_56px]">
        <StaticField icon={<CruiseIcon />} label={copy.route} value={copy.routeValue} sublabel={copy.routeSub} />
        <StaticField icon={<UsersIcon />} label={copy.cabin} value={copy.cabinValue} sublabel={copy.cabinSub} withLeftBorder />
        <StaticField icon={<CalendarIcon />} label={copy.departure} value={copy.departureValue} sublabel={copy.departureSub} withLeftBorder />
        <StaticField icon={<UsersIcon />} label={copy.guests} value={copy.guestsValue} sublabel={copy.guestsSub} withLeftBorder />
        <a
          href="/kapal-pesiar#service-filter"
          aria-label={buttonLabel}
          className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff6541_0%,#ef4423_100%)] px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_18px_34px_-18px_rgba(239,68,35,0.82)] transition hover:brightness-105 xl:mt-1 xl:h-[56px] xl:w-[56px] xl:self-center xl:px-0 xl:py-0"
        >
          <SearchIcon />
        </a>
      </div>
    </div>
  )
}
