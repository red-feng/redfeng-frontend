"use client"

import type { Locale } from "@/lib/i18n"

function BedIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M4 18v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" />
      <path d="M4 14h16M7 10V8.5A1.5 1.5 0 0 1 8.5 7h2A1.5 1.5 0 0 1 12 8.5V10M12 10V8.5A1.5 1.5 0 0 1 13.5 7h2A1.5 1.5 0 0 1 17 8.5V10" />
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

export default function HotelHeroSearchBar({ locale, buttonLabel }: { locale: Locale; buttonLabel: string }) {
  const copy = {
    id: {
      destination: "Destinasi",
      checkin: "Check-in",
      checkout: "Check-out",
      guests: "Tamu & Kamar",
      destinationValue: "Bali",
      destinationSub: "Indonesia",
      checkinValue: "27 Mei 2026",
      checkinSub: "Rabu",
      checkoutValue: "30 Mei 2026",
      checkoutSub: "Sabtu",
      guestsValue: "2 Tamu, 1 Kamar",
      guestsSub: "Sarapan tersedia",
    },
    en: {
      destination: "Destination",
      checkin: "Check-in",
      checkout: "Check-out",
      guests: "Guests & Rooms",
      destinationValue: "Bali",
      destinationSub: "Indonesia",
      checkinValue: "May 27, 2026",
      checkinSub: "Wednesday",
      checkoutValue: "May 30, 2026",
      checkoutSub: "Saturday",
      guestsValue: "2 Guests, 1 Room",
      guestsSub: "Breakfast available",
    },
    zh: {
      destination: "目的地",
      checkin: "入住",
      checkout: "退房",
      guests: "住客与房间",
      destinationValue: "巴厘岛",
      destinationSub: "印度尼西亚",
      checkinValue: "2026年5月27日",
      checkinSub: "周三",
      checkoutValue: "2026年5月30日",
      checkoutSub: "周六",
      guestsValue: "2位住客，1间房",
      guestsSub: "含早餐",
    },
  }[locale]

  return (
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.92fr)_minmax(0,0.92fr)_minmax(0,1fr)_56px]">
      <StaticField icon={<BedIcon />} label={copy.destination} value={copy.destinationValue} sublabel={copy.destinationSub} />
      <StaticField icon={<CalendarIcon />} label={copy.checkin} value={copy.checkinValue} sublabel={copy.checkinSub} withLeftBorder />
      <StaticField icon={<CalendarIcon />} label={copy.checkout} value={copy.checkoutValue} sublabel={copy.checkoutSub} withLeftBorder />
      <StaticField icon={<UsersIcon />} label={copy.guests} value={copy.guestsValue} sublabel={copy.guestsSub} withLeftBorder />

      <a
        href="/hotel#service-filter"
        aria-label={buttonLabel}
        className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff6541_0%,#ef4423_100%)] px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_18px_34px_-18px_rgba(239,68,35,0.82)] transition hover:brightness-105 xl:mt-1 xl:h-[56px] xl:w-[56px] xl:self-center xl:px-0 xl:py-0"
      >
        <SearchIcon />
      </a>
    </div>
  )
}
