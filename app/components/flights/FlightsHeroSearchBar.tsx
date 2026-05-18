"use client"

import { useState } from "react"
import type { Locale } from "@/lib/i18n"

function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M3 13.5h7.3l4.2 5.1c.3.4.8.6 1.3.6h1.5l-2.4-5.7h4.2c.9 0 1.7-.6 1.9-1.5l.2-.8-.2-.8c-.2-.9-1-1.5-1.9-1.5h-4.2l2.4-5.7h-1.5c-.5 0-1 .2-1.3.6l-4.2 5.1H3l-.8 1.2.8 1.4Z" />
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

type FieldProps = {
  icon: React.ReactNode
  label: string
  value: string
  sublabel: string
  withLeftBorder?: boolean
}

function StaticField({ icon, label, value, sublabel, withLeftBorder = false }: FieldProps) {
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

export default function FlightsHeroSearchBar({
  locale,
  buttonLabel,
}: {
  locale: Locale
  buttonLabel: string
}) {
  const [tripType, setTripType] = useState<"round_trip" | "one_way" | "multi_city">("round_trip")
  const copy = {
    id: {
      roundTrip: "Pulang Pergi",
      oneWay: "Sekali Jalan",
      multiCity: "Multi-city",
      from: "Dari",
      to: "Ke",
      depart: "Tanggal Berangkat",
      return: "Tanggal Pulang",
      passengers: "Penumpang & Kelas",
      fromValue: "Jakarta (CGK)",
      fromSub: "Soekarno-Hatta Intl",
      toValue: "Bali / Denpasar (DPS)",
      toSub: "Ngurah Rai Intl",
      departValue: "25 Mei 2026",
      departSub: "Senin",
      returnValue: "29 Mei 2026",
      returnSub: "Jumat",
      passengersValue: "1 Dewasa, Ekonomi",
      passengersSub: "Kabin fleksibel",
    },
    en: {
      roundTrip: "Round Trip",
      oneWay: "One Way",
      multiCity: "Multi-city",
      from: "From",
      to: "To",
      depart: "Departure Date",
      return: "Return Date",
      passengers: "Passengers & Class",
      fromValue: "Jakarta (CGK)",
      fromSub: "Soekarno-Hatta Intl",
      toValue: "Bali / Denpasar (DPS)",
      toSub: "Ngurah Rai Intl",
      departValue: "May 25, 2026",
      departSub: "Monday",
      returnValue: "May 29, 2026",
      returnSub: "Friday",
      passengersValue: "1 Adult, Economy",
      passengersSub: "Flexible cabin",
    },
    zh: {
      roundTrip: "往返",
      oneWay: "单程",
      multiCity: "多城市",
      from: "出发地",
      to: "目的地",
      depart: "出发日期",
      return: "返程日期",
      passengers: "乘客与舱位",
      fromValue: "雅加达 (CGK)",
      fromSub: "苏加诺-哈达国际机场",
      toValue: "巴厘岛 / 登巴萨 (DPS)",
      toSub: "伍拉赖国际机场",
      departValue: "2026年5月25日",
      departSub: "周一",
      returnValue: "2026年5月29日",
      returnSub: "周五",
      passengersValue: "1位成人，经济舱",
      passengersSub: "舱位灵活",
    },
  }[locale]

  const tabs = [
    { key: "round_trip" as const, label: copy.roundTrip },
    { key: "one_way" as const, label: copy.oneWay },
    { key: "multi_city" as const, label: copy.multiCity },
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

      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.92fr)_minmax(0,0.92fr)_minmax(0,1fr)_56px]">
        <StaticField icon={<PlaneIcon />} label={copy.from} value={copy.fromValue} sublabel={copy.fromSub} />
        <StaticField icon={<PlaneIcon />} label={copy.to} value={copy.toValue} sublabel={copy.toSub} withLeftBorder />
        <StaticField icon={<CalendarIcon />} label={copy.depart} value={copy.departValue} sublabel={copy.departSub} withLeftBorder />
        <StaticField
          icon={<CalendarIcon />}
          label={tripType === "one_way" ? copy.depart : copy.return}
          value={tripType === "one_way" ? copy.departValue : copy.returnValue}
          sublabel={tripType === "one_way" ? copy.departSub : copy.returnSub}
          withLeftBorder
        />
        <StaticField icon={<UsersIcon />} label={copy.passengers} value={copy.passengersValue} sublabel={copy.passengersSub} withLeftBorder />

        <a
          href="/pesawat#service-filter"
          aria-label={buttonLabel}
          className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff6541_0%,#ef4423_100%)] px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_18px_34px_-18px_rgba(239,68,35,0.82)] transition hover:brightness-105 xl:mt-1 xl:h-[56px] xl:w-[56px] xl:self-center xl:px-0 xl:py-0"
        >
          <SearchIcon />
        </a>
      </div>
    </div>
  )
}
