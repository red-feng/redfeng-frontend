"use client"

import { useState } from "react"
import type { Locale } from "@/lib/i18n"
import {
  CalendarIcon,
  FlightSearchTripTab,
  FlightSearchStaticField,
  PlaneIcon,
  SearchIcon,
  UsersIcon,
} from "@/app/components/flights/FlightSearchHomepageBaseline"

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
  const tripGroupValue =
    tripType === "round_trip" ? "Pulang pergi" : tripType === "one_way" ? "Sekali jalan" : "Multi-city"
  const queryValue = `${copy.fromValue} ${copy.toValue}`

  return (
    <form method="get" action="/pesawat/catalog" className="space-y-3">
      <input type="hidden" name="from" value={copy.fromValue} />
      <input type="hidden" name="to" value={copy.toValue} />
      <input type="hidden" name="trip" value={tripType} />
      <input type="hidden" name="depart" value="2026-05-25" />
      <input type="hidden" name="return" value={tripType === "one_way" ? "" : "2026-05-29"} />
      <input type="hidden" name="passengers" value={copy.passengersValue.split(",")[0] || copy.passengersValue} />
      <input type="hidden" name="cabin" value={locale === "en" ? "Economy" : locale === "zh" ? "经济舱" : "Economy"} />
      <input type="hidden" name="group" value={tripGroupValue} />
      <input type="hidden" name="q" value={queryValue} />
      <input type="hidden" name="sort" value="best" />

      <div className="flex gap-2 overflow-x-auto border-b border-[#edf1f5] px-2 py-1 text-sm font-medium text-slate-700 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const isActive = tripType === tab.key
          return (
            <FlightSearchTripTab
              key={tab.key}
              active={isActive}
              label={tab.label}
              onClick={() => setTripType(tab.key)}
            />
          )
        })}
      </div>

      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.92fr)_minmax(0,0.92fr)_minmax(0,1fr)_56px]">
        <FlightSearchStaticField icon={<PlaneIcon />} label={copy.from} value={copy.fromValue} sublabel={copy.fromSub} />
        <FlightSearchStaticField icon={<PlaneIcon />} label={copy.to} value={copy.toValue} sublabel={copy.toSub} withLeftBorder />
        <FlightSearchStaticField icon={<CalendarIcon />} label={copy.depart} value={copy.departValue} sublabel={copy.departSub} withLeftBorder />
        <FlightSearchStaticField
          icon={<CalendarIcon />}
          label={tripType === "one_way" ? copy.depart : copy.return}
          value={tripType === "one_way" ? copy.departValue : copy.returnValue}
          sublabel={tripType === "one_way" ? copy.departSub : copy.returnSub}
          withLeftBorder
        />
        <FlightSearchStaticField icon={<UsersIcon />} label={copy.passengers} value={copy.passengersValue} sublabel={copy.passengersSub} withLeftBorder />

        <button
          type="submit"
          aria-label={buttonLabel}
          className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff6541_0%,#ef4423_100%)] px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_18px_34px_-18px_rgba(239,68,35,0.82)] transition hover:brightness-105 xl:mt-1 xl:h-[56px] xl:w-[56px] xl:self-center xl:px-0 xl:py-0"
        >
          <SearchIcon />
        </button>
      </div>
    </form>
  )
}
