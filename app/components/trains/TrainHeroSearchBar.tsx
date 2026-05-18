"use client"

import { useState } from "react"
import type { Locale } from "@/lib/i18n"

function TrainIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <rect x="6" y="4.5" width="12" height="12" rx="2.5" />
      <path d="M8.5 16.5 6.5 19M15.5 16.5l2 2.5M9 20h6M8.5 8.5h2M13.5 8.5h2M6 12.5h12" />
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

export default function TrainHeroSearchBar({ locale, buttonLabel }: { locale: Locale; buttonLabel: string }) {
  const [tripType, setTripType] = useState<"round_trip" | "one_way" | "fast_train">("one_way")
  const copy = {
    id: {
      oneWay: "Sekali Jalan",
      roundTrip: "Pulang Pergi",
      fastTrain: "Kereta Cepat",
      from: "Stasiun Asal",
      to: "Stasiun Tujuan",
      depart: "Berangkat",
      return: "Pulang",
      passengers: "Penumpang",
      fromValue: "Gambir",
      fromSub: "Jakarta",
      toValue: "Bandung",
      toSub: "Jawa Barat",
      departValue: "28 Mei 2026",
      departSub: "Kamis",
      returnValue: "30 Mei 2026",
      returnSub: "Sabtu",
      passengersValue: "2 Dewasa, Ekonomi",
      passengersSub: "Pilihan kursi",
    },
    en: {
      oneWay: "One Way",
      roundTrip: "Round Trip",
      fastTrain: "High-Speed Rail",
      from: "Origin Station",
      to: "Destination Station",
      depart: "Departure",
      return: "Return",
      passengers: "Passengers",
      fromValue: "Gambir",
      fromSub: "Jakarta",
      toValue: "Bandung",
      toSub: "West Java",
      departValue: "May 28, 2026",
      departSub: "Thursday",
      returnValue: "May 30, 2026",
      returnSub: "Saturday",
      passengersValue: "2 Adults, Economy",
      passengersSub: "Seat options",
    },
    zh: {
      oneWay: "单程",
      roundTrip: "往返",
      fastTrain: "高铁",
      from: "出发站",
      to: "到达站",
      depart: "出发",
      return: "返程",
      passengers: "乘客",
      fromValue: "甘比尔站",
      fromSub: "雅加达",
      toValue: "万隆",
      toSub: "西爪哇",
      departValue: "2026年5月28日",
      departSub: "周四",
      returnValue: "2026年5月30日",
      returnSub: "周六",
      passengersValue: "2位成人，经济舱",
      passengersSub: "座位选项",
    },
  }[locale]

  const tabs = [
    { key: "one_way" as const, label: copy.oneWay },
    { key: "round_trip" as const, label: copy.roundTrip },
    { key: "fast_train" as const, label: copy.fastTrain },
  ]

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto border-b border-[#edf1f5] px-2 py-1 text-sm font-medium text-slate-700 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const isActive = tripType === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTripType(tab.key)}
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

      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,1.18fr)_minmax(0,0.9fr)_minmax(0,1fr)_56px]">
        <StaticField icon={<TrainIcon />} label={copy.from} value={copy.fromValue} sublabel={copy.fromSub} />
        <StaticField icon={<TrainIcon />} label={copy.to} value={copy.toValue} sublabel={copy.toSub} withLeftBorder />
        <StaticField icon={<CalendarIcon />} label={copy.depart} value={copy.departValue} sublabel={copy.departSub} withLeftBorder />
        <StaticField
          icon={tripType === "fast_train" ? <UsersIcon /> : <CalendarIcon />}
          label={tripType === "one_way" || tripType === "fast_train" ? copy.passengers : copy.return}
          value={tripType === "one_way" || tripType === "fast_train" ? copy.passengersValue : copy.returnValue}
          sublabel={tripType === "one_way" || tripType === "fast_train" ? copy.passengersSub : copy.returnSub}
          withLeftBorder
        />
        <a
          href="/kereta/catalog#service-filter"
          aria-label={buttonLabel}
          className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff6541_0%,#ef4423_100%)] px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_18px_34px_-18px_rgba(239,68,35,0.82)] transition hover:brightness-105 xl:mt-1 xl:h-[56px] xl:w-[56px] xl:self-center xl:px-0 xl:py-0"
        >
          <SearchIcon />
        </a>
      </div>
    </div>
  )
}
