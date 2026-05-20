"use client"

import type { ReactNode } from "react"
import { useState } from "react"

import { ChevronIcon, SearchIcon } from "@/app/components/flights/FlightSearchHomepageBaseline"
import type { Locale } from "@/lib/i18n"

type TripType = "one_way" | "round_trip" | "multi_city"
type CabinClass = "economy" | "premium_economy" | "business"

const fieldBaseClass =
  "group flex h-[78px] items-center justify-between gap-3 rounded-[999px] border border-[#d7e3f1] bg-white px-5 text-left shadow-[0_12px_30px_-26px_rgba(15,23,42,0.38)] transition hover:border-[#c6d8eb]"

export default function FlightHomepageHeroPanel({ locale }: { locale: Locale }) {
  const [tripType, setTripType] = useState<TripType>("one_way")
  const [cabinClass, setCabinClass] = useState<CabinClass>("economy")

  const copy = {
    id: {
      statusLabel: "Katalog dummy",
      statusBody: "Landing marketing dan katalog dummy aktif, engine pencarian live menyusul.",
      tripTypes: {
        one_way: "Sekali Jalan",
        round_trip: "Pulang - Pergi",
        multi_city: "Multi Kota",
      },
      cabinLabel: "Kelas Kabin",
      passengerLabel: "Penumpang",
      searchLabel: "Cari penerbangan",
      fromLabel: "Dari",
      toLabel: "Ke",
      departLabel: "Tanggal Pergi",
      passengerValue: "1 Dewasa",
      cabinOptions: {
        economy: "Ekonomi",
        premium_economy: "Premium Economy",
        business: "Bisnis",
      },
      benefits: ["Harga tiket terbaik", "Maskapai terpercaya", "Support 24/7", "Pembayaran fleksibel"],
    },
    en: {
      statusLabel: "Dummy catalog",
      statusBody: "Marketing landing and sample catalog are active while the live search engine is still on the way.",
      tripTypes: {
        one_way: "One Way",
        round_trip: "Round Trip",
        multi_city: "Multi City",
      },
      cabinLabel: "Cabin Class",
      passengerLabel: "Passengers",
      searchLabel: "Search flights",
      fromLabel: "From",
      toLabel: "To",
      departLabel: "Departure Date",
      passengerValue: "1 Adult",
      cabinOptions: {
        economy: "Economy",
        premium_economy: "Premium Economy",
        business: "Business",
      },
      benefits: ["Best ticket prices", "Trusted airlines", "24/7 support", "Flexible payments"],
    },
    zh: {
      statusLabel: "示例目录",
      statusBody: "营销落地页与示例目录已启用，实时搜索引擎稍后接入。",
      tripTypes: {
        one_way: "单程",
        round_trip: "往返",
        multi_city: "多城市",
      },
      cabinLabel: "舱位等级",
      passengerLabel: "乘客",
      searchLabel: "搜索航班",
      fromLabel: "出发地",
      toLabel: "目的地",
      departLabel: "出发日期",
      passengerValue: "1位成人",
      cabinOptions: {
        economy: "经济舱",
        premium_economy: "超级经济舱",
        business: "商务舱",
      },
      benefits: ["超值机票价格", "可信赖航空公司", "24/7 全天支持", "灵活支付"],
    },
  }[locale]

  const from = { code: "CGK", city: locale === "zh" ? "雅加达" : "Jakarta" }
  const to = { code: "DPS", city: locale === "zh" ? "登巴萨" : "Denpasar" }
  const departureValue = locale === "en" ? "25/05/2026" : locale === "zh" ? "25/05/2026" : "25/05/2026"
  const cabinValue = copy.cabinOptions[cabinClass]

  return (
    <form action="/pesawat/catalog" method="get" className="px-5 py-5 lg:px-8 lg:py-7">
      <input type="hidden" name="trip" value={tripType} />
      <input type="hidden" name="from" value={`${from.code} ${from.city}`} />
      <input type="hidden" name="to" value={`${to.code} ${to.city}`} />
      <input type="hidden" name="depart" value="2026-05-25" />
      <input type="hidden" name="passengers" value={copy.passengerValue} />
      <input type="hidden" name="cabin" value={cabinValue} />

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex rounded-full border border-[#ffd27d] bg-[#fff9ec] px-3.5 py-1.5 text-[12px] font-semibold text-[#de7a16]">
            {copy.statusLabel}
          </span>
          <p className="text-[13px] leading-6 text-[#6b7f99]">{copy.statusBody}</p>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {(Object.entries(copy.tripTypes) as Array<[TripType, string]>).map(([key, label]) => {
              const active = tripType === key

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTripType(key)}
                  className={`inline-flex items-center gap-3 text-[14px] font-semibold transition ${
                    active ? "text-[#415874]" : "text-[#8296b1] hover:text-[#415874]"
                  }`}
                >
                  <span className={`h-[17px] w-[17px] rounded-full border ${active ? "border-[#ff5a3d] bg-[#ff5a3d]" : "border-[#cad7e6] bg-white"}`}>
                    <span className={`block h-full w-full rounded-full border-[4px] border-white ${active ? "opacity-100" : "opacity-0"}`} />
                  </span>
                  {label}
                </button>
              )
            })}
          </div>

          <label className="flex items-center gap-4 xl:min-w-[350px] xl:justify-end">
            <span className="text-[15px] font-semibold text-[#42526b]">{copy.cabinLabel}</span>
            <span className="relative block w-full max-w-[246px]">
              <select
                name="cabin_class"
                value={cabinClass}
                onChange={(event) => setCabinClass(event.target.value as CabinClass)}
                className="h-[40px] w-full appearance-none rounded-[14px] border border-[#dde5ef] bg-white px-4 pr-10 text-[14px] font-medium text-[#28374a] shadow-[0_8px_24px_-22px_rgba(15,23,42,0.45)] outline-none transition focus:border-[#c8d8ea]"
              >
                <option value="economy">{copy.cabinOptions.economy}</option>
                <option value="premium_economy">{copy.cabinOptions.premium_economy}</option>
                <option value="business">{copy.cabinOptions.business}</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#7f93aa]">
                <ChevronIcon />
              </span>
            </span>
          </label>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)_minmax(290px,1.25fr)_minmax(290px,1.45fr)_76px]">
          <button type="button" className={fieldBaseClass}>
            <FieldText label={copy.fromLabel} code={from.code} city={from.city} />
            <span className="shrink-0 text-[#94a7be]">
              <SearchIcon />
            </span>
          </button>

          <div className="hidden items-center justify-center xl:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e2eaf3] text-[#ff5a3d]">
              <SwapIcon />
            </div>
          </div>

          <button type="button" className={fieldBaseClass}>
            <FieldText label={copy.toLabel} code={to.code} city={to.city} />
            <span className="shrink-0 text-[#94a7be]">
              <SearchIcon />
            </span>
          </button>

          <button type="button" className={fieldBaseClass}>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#4a617d]">{copy.departLabel}</p>
              <p className="mt-2 text-[15px] font-semibold text-[#25364a]">{departureValue}</p>
            </div>
            <span className="shrink-0 text-[#25364a]">
              <CalendarFieldIcon />
            </span>
          </button>

          <button type="button" className={fieldBaseClass}>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#4a617d]">{copy.passengerLabel}</p>
              <p className="mt-2 text-[15px] font-semibold text-[#25364a]">{copy.passengerValue}</p>
            </div>
            <span className="shrink-0 text-[#94a7be]">
              <ChevronIcon />
            </span>
          </button>

          <button
            type="submit"
            aria-label={copy.searchLabel}
            className="inline-flex h-[76px] items-center justify-center rounded-[24px] bg-[#ff6a21] text-white shadow-[0_20px_32px_-20px_rgba(255,106,33,0.78)] transition hover:brightness-105"
          >
            <SearchIcon />
          </button>
        </div>

        <div className="grid gap-5 border-t border-[#edf1f5] px-2 pt-7 text-center sm:grid-cols-2 xl:grid-cols-4">
          <Benefit icon={<TagIcon />} label={copy.benefits[0]} />
          <Benefit icon={<ShieldIcon />} label={copy.benefits[1]} />
          <Benefit icon={<HeadsetIcon />} label={copy.benefits[2]} />
          <Benefit icon={<CardOutlineIcon />} label={copy.benefits[3]} />
        </div>
      </div>
    </form>
  )
}

function FieldText({ label, code, city }: { label: string; code: string; city: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[14px] font-semibold text-[#4a617d]">{label}</p>
      <p className="mt-2 flex items-baseline gap-3 truncate text-[#25364a]">
        <span className="text-[15px] font-bold">{code}</span>
        <span className="truncate text-[15px] font-semibold">{city}</span>
      </p>
    </div>
  )
}

function Benefit({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full border border-[#d8e2ef] bg-white text-[#5f7490]">
        {icon}
      </div>
      <p className="text-[13px] font-semibold text-[#7088a7]">{label}</p>
    </div>
  )
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M7 7h10" />
      <path d="m13 3 4 4-4 4" />
      <path d="M17 17H7" />
      <path d="m11 13-4 4 4 4" />
    </svg>
  )
}

function CalendarFieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M8 3v4M16 3v4M4 9.5h16" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M12 4H7.8a2 2 0 0 0-1.4.6L3.9 7.1a2 2 0 0 0 0 2.8l6.2 6.2a2 2 0 0 0 2.8 0l6.5-6.5a2 2 0 0 0 0-2.8L17 4.6A2 2 0 0 0 15.6 4H12Z" />
      <circle cx="8.5" cy="8.5" r="1.2" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M12 3.5 18 6v5.2c0 4-2.3 7.7-6 9.3-3.7-1.6-6-5.3-6-9.3V6l6-2.5Z" />
      <path d="m9.6 11.8 1.7 1.7 3.3-3.6" />
    </svg>
  )
}

function HeadsetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M5 13a7 7 0 0 1 14 0" />
      <rect x="4" y="12" width="3.5" height="6" rx="1.4" />
      <rect x="16.5" y="12" width="3.5" height="6" rx="1.4" />
      <path d="M18 19a3 3 0 0 1-3 3h-1.5" />
    </svg>
  )
}

function CardOutlineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <rect x="4" y="6" width="16" height="12" rx="2.4" />
      <path d="M4 10h16" />
    </svg>
  )
}
