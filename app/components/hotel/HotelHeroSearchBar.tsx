"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { Locale } from "@/lib/i18n"

type DestinationOption = {
  value: string
  sublabel: string
}

type SearchCopy = {
  destination: string
  checkin: string
  checkout: string
  guests: string
  destinationPlaceholder: string
  destinationTitle: string
  destinationHint: string
  checkinTitle: string
  checkoutTitle: string
  dateHint: string
  guestsTitle: string
  guestsSub: string
  guestsCapacityHint: string
  adults: string
  children: string
  rooms: string
  adultsHint: string
  childrenHint: string
  roomsHint: string
  done: string
  doneDate: string
  decrease: string
  increase: string
  totalGuests: string
  nights: string
  searchPath: string
  destinationOptions: DestinationOption[]
}

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

function AdultIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <circle cx="12" cy="8" r="2.75" />
      <path d="M6 18c.9-3 3-4.7 6-4.7s5.1 1.7 6 4.7" />
    </svg>
  )
}

function ChildIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <circle cx="12" cy="8.5" r="2.2" />
      <path d="M7.5 17.5c.7-2.4 2.3-3.7 4.5-3.7s3.8 1.3 4.5 3.7" />
      <path d="M9.25 5.75 8 4.5M14.75 5.75 16 4.5" />
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

function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
      <path d="M5 12h14" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M12 20s-6-4.4-6-9.4a6 6 0 1 1 12 0c0 5-6 9.4-6 9.4Z" />
      <circle cx="12" cy="10.5" r="2.5" />
    </svg>
  )
}

function SearchMiniIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  )
}

function useDismissableLayer(isOpen: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("mousedown", handlePointerDown)
    window.addEventListener("keydown", handleEscape)
    return () => {
      window.removeEventListener("mousedown", handlePointerDown)
      window.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, onClose])

  return ref
}

function CounterButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-[#dbe7fb] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_100%)] text-[#2f6ee5] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-[#bfd7ff] hover:bg-[#eef5ff] disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300"
    >
      {children}
    </button>
  )
}

function FieldShell({
  icon,
  label,
  value,
  sublabel,
  withLeftBorder = false,
  isOpen = false,
  onClick,
}: {
  icon: ReactNode
  label: string
  value: string
  sublabel: string
  withLeftBorder?: boolean
  isOpen?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex w-full min-w-0 items-center gap-3 px-3.5 py-3 text-left md:px-4.5 ${
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
          <span className={`shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}>
            <ChevronIcon />
          </span>
        </div>
        <p className="mt-1 truncate text-[12px] text-slate-500">{sublabel}</p>
      </div>
    </button>
  )
}

function FloatingPanel({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[300] bg-slate-950/28 xl:hidden" aria-hidden="true" onClick={onClose} />
      <div className="fixed inset-x-3 bottom-3 z-[320] overflow-hidden rounded-[28px] border border-[#e4ebf4] bg-white shadow-[0_28px_70px_-32px_rgba(15,23,42,0.32)] xl:hidden">
        <div className="flex justify-center border-b border-slate-100 px-5 pt-3">
          <span className="h-1.5 w-14 rounded-full bg-slate-200" />
        </div>
        {children}
      </div>
      <div className="absolute left-0 top-[calc(100%+12px)] z-[320] hidden min-w-[300px] overflow-hidden rounded-[24px] border border-[#e4ebf4] bg-white shadow-[0_28px_70px_-32px_rgba(15,23,42,0.32)] xl:block">
        {children}
      </div>
    </>
  )
}

function DestinationField({
  copy,
  value,
  sublabel,
  onPick,
}: {
  copy: SearchCopy
  value: string
  sublabel: string
  onPick: (option: DestinationOption) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const layerRef = useDismissableLayer(isOpen, () => setIsOpen(false))

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return copy.destinationOptions
    return copy.destinationOptions.filter((option) => `${option.value} ${option.sublabel}`.toLowerCase().includes(keyword))
  }, [copy.destinationOptions, query])

  return (
    <div ref={layerRef} className="relative">
      <FieldShell
        icon={<LocationIcon />}
        label={copy.destination}
        value={value}
        sublabel={sublabel}
        isOpen={isOpen}
        onClick={() => {
          setQuery(value)
          setIsOpen((current) => !current)
        }}
      />
      <FloatingPanel isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{copy.destinationTitle}</p>
          <p className="mt-1 text-[13px] text-slate-500">{copy.destinationHint}</p>
        </div>
        <div className="border-b border-slate-100 px-4 py-4">
          <label className="flex items-center gap-3 rounded-[18px] border border-[#e4ebf4] bg-[#fbfdff] px-4 py-3">
            <span className="text-slate-400">
              <SearchMiniIcon />
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.destinationPlaceholder}
              className="w-full bg-transparent text-[14px] text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>
        <div className="max-h-[320px] overflow-y-auto px-3 py-2">
          {filtered.map((option) => (
            <button
              key={`${option.value}-${option.sublabel}`}
              type="button"
              onClick={() => {
                onPick(option)
                setIsOpen(false)
              }}
              className="flex w-full items-start gap-3 rounded-[18px] px-3 py-3 text-left transition hover:bg-slate-50"
            >
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff3ee] text-[#ef4423]">
                <LocationIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-slate-950">{option.value}</span>
                <span className="mt-0.5 block truncate text-[12px] text-slate-500">{option.sublabel}</span>
              </span>
            </button>
          ))}
        </div>
      </FloatingPanel>
    </div>
  )
}

function DateField({
  title,
  helper,
  value,
  sublabel,
  withLeftBorder = false,
  min,
  onChange,
  doneLabel,
}: {
  title: string
  helper: string
  value: string
  sublabel: string
  withLeftBorder?: boolean
  min?: string
  onChange: (value: string) => void
  doneLabel: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const layerRef = useDismissableLayer(isOpen, () => setIsOpen(false))

  return (
    <div ref={layerRef} className="relative">
      <FieldShell
        icon={<CalendarIcon />}
        label={title}
        value={formatDateValue(value)}
        sublabel={sublabel}
        withLeftBorder={withLeftBorder}
        isOpen={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      />
      <FloatingPanel isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className="mt-1 text-[13px] text-slate-500">{helper}</p>
        </div>
        <div className="px-4 py-4">
          <input
            type="date"
            value={value}
            min={min}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-[18px] border border-[#e4ebf4] bg-[#fbfdff] px-4 py-3 text-[14px] text-slate-900 outline-none focus:border-[#bfd7ff]"
          />
        </div>
        <div className="border-t border-slate-100 bg-[#fbfdff] px-4 py-4">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="ml-auto inline-flex h-12 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#4092ff_0%,#2f6ee5_100%)] px-5 text-[14px] font-semibold text-white shadow-[0_18px_34px_-18px_rgba(47,110,229,0.7)] transition hover:brightness-105"
          >
            {doneLabel}
          </button>
        </div>
      </FloatingPanel>
    </div>
  )
}

function GuestsRoomsField({
  locale,
  copy,
  adults,
  childrenCount,
  rooms,
  onAdultsChange,
  onChildrenChange,
  onRoomsChange,
  searchHref,
}: {
  locale: Locale
  copy: SearchCopy
  adults: number
  childrenCount: number
  rooms: number
  onAdultsChange: (value: number) => void
  onChildrenChange: (value: number) => void
  onRoomsChange: (value: number) => void
  searchHref: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const layerRef = useDismissableLayer(isOpen, () => setIsOpen(false))
  const guestCount = adults + childrenCount
  const minimumRooms = Math.max(1, Math.ceil(adults / 2), Math.ceil(guestCount / 3))
  const displayedRooms = Math.max(rooms, minimumRooms)
  const capacityHint = copy.guestsCapacityHint.replace("{rooms}", String(minimumRooms))
  const value =
    locale === "en"
      ? `${childrenCount > 0 ? `${adults} ${adults === 1 ? "Adult" : "Adults"}, ${childrenCount} ${childrenCount === 1 ? "Child" : "Children"}` : `${adults} ${adults === 1 ? "Adult" : "Adults"}`}, ${displayedRooms} ${displayedRooms === 1 ? "Room" : "Rooms"}`
      : locale === "zh"
        ? `${childrenCount > 0 ? `${adults}位成人，${childrenCount}位儿童` : `${adults}位成人`}，${displayedRooms}间房`
        : `${childrenCount > 0 ? `${adults} Dewasa, ${childrenCount} Anak` : `${adults} Dewasa`}, ${displayedRooms} Kamar`
  const summary =
    locale === "en"
      ? `${guestCount} ${copy.totalGuests}, ${displayedRooms} ${displayedRooms === 1 ? "room" : "rooms"}`
      : locale === "zh"
        ? `${guestCount}${copy.totalGuests}，共${displayedRooms}间房`
        : `${guestCount} ${copy.totalGuests}, ${displayedRooms} Kamar`

  const rows = [
    { key: "adults", icon: <AdultIcon />, label: copy.adults, hint: copy.adultsHint, value: adults, min: 1, max: 8, setValue: onAdultsChange },
    { key: "children", icon: <ChildIcon />, label: copy.children, hint: copy.childrenHint, value: childrenCount, min: 0, max: 6, setValue: onChildrenChange },
    { key: "rooms", icon: <BedIcon />, label: copy.rooms, hint: copy.roomsHint, value: displayedRooms, min: 1, max: 4, setValue: onRoomsChange },
  ] as const

  return (
    <div ref={layerRef} className="relative">
      <FieldShell icon={<UsersIcon />} label={copy.guests} value={value} sublabel={summary} withLeftBorder isOpen={isOpen} onClick={() => setIsOpen((current) => !current)} />
      <FloatingPanel isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{copy.guestsTitle}</p>
          <p className="mt-1 text-[13px] text-slate-500">{copy.guestsSub}</p>
          <p className="mt-2 text-[12px] font-medium text-[#2f6ee5]">{capacityHint}</p>
        </div>
        <div className="px-4 py-2">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-3 border-t border-slate-100 px-1 py-4 first:border-t-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff6f2] text-[#ef4423]">
                {row.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-slate-900">{row.label}</p>
                <p className="mt-0.5 text-[12px] text-slate-500">{row.hint}</p>
              </div>
              <div className="flex items-center gap-3">
                <CounterButton
                  label={`${copy.decrease} ${row.label}`}
                  disabled={row.key === "rooms" ? row.value <= minimumRooms : row.value <= row.min}
                  onClick={() => row.setValue(Math.max(row.key === "rooms" ? minimumRooms : row.min, row.value - 1))}
                >
                  <MinusIcon />
                </CounterButton>
                <span className="inline-flex min-w-[30px] justify-center text-[18px] font-semibold text-slate-950">{row.value}</span>
                <CounterButton
                  label={`${copy.increase} ${row.label}`}
                  disabled={row.value >= row.max}
                  onClick={() => row.setValue(Math.min(row.max, row.value + 1))}
                >
                  <PlusIcon />
                </CounterButton>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 bg-[#fbfdff] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-slate-500">{capacityHint}</p>
            <a
              href={searchHref}
              onClick={() => setIsOpen(false)}
              className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#4092ff_0%,#2f6ee5_100%)] px-5 text-[14px] font-semibold text-white shadow-[0_18px_34px_-18px_rgba(47,110,229,0.7)] transition hover:brightness-105"
            >
              {copy.done}
            </a>
          </div>
        </div>
      </FloatingPanel>
    </div>
  )
}

function formatDateValue(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(date)
}

function formatWeekday(value: string, locale: Locale) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ""
  const map: Record<Locale, string> = { id: "id-ID", en: "en-US", zh: "zh-CN" }
  return new Intl.DateTimeFormat(map[locale], { weekday: "long" }).format(date)
}

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() + amount)
  return date.toISOString().slice(0, 10)
}

export default function HotelHeroSearchBar({ locale, buttonLabel }: { locale: Locale; buttonLabel: string }) {
  const copy: SearchCopy =
    locale === "en"
      ? {
          destination: "Destination",
          checkin: "Check-in",
          checkout: "Check-out",
          guests: "Guests & Rooms",
          destinationPlaceholder: "Search destination or hotel area",
          destinationTitle: "Popular destinations",
          destinationHint: "Choose a stay destination to seed hotel results faster.",
          checkinTitle: "Check-in date",
          checkoutTitle: "Check-out date",
          dateHint: "Set your stay dates to refine room availability.",
          guestsTitle: "Guests & room setup",
          guestsSub: "Set adults, children, and rooms for a more precise stay search.",
          guestsCapacityHint: "At least {rooms} room(s) recommended for this guest mix.",
          adults: "Adults",
          children: "Children",
          rooms: "Rooms",
          adultsHint: "Age 18+",
          childrenHint: "Under 18 years old",
          roomsHint: "Recommended room count",
          done: "Search Hotels",
          doneDate: "Apply Date",
          decrease: "Decrease",
          increase: "Increase",
          totalGuests: "guests total",
          nights: "nights",
          searchPath: "/hotel/catalog",
          destinationOptions: [
            { value: "Bali", sublabel: "Indonesia" },
            { value: "Jakarta", sublabel: "Indonesia" },
            { value: "Singapore", sublabel: "Singapore" },
            { value: "Bangkok", sublabel: "Thailand" },
            { value: "Tokyo", sublabel: "Japan" },
            { value: "Labuan Bajo", sublabel: "Indonesia" },
          ],
        }
      : locale === "zh"
        ? {
            destination: "目的地",
            checkin: "入住",
            checkout: "退房",
            guests: "住客与房间",
            destinationPlaceholder: "搜索目的地或酒店区域",
            destinationTitle: "热门入住目的地",
            destinationHint: "先选择目的地，让酒店结果更快聚焦。",
            checkinTitle: "入住日期",
            checkoutTitle: "退房日期",
            dateHint: "设置入住与退房时间，缩小房型范围。",
            guestsTitle: "住客与房间设置",
            guestsSub: "调整成人、儿童与房间数量，让搜索结果更准确。",
            guestsCapacityHint: "当前住客组合至少建议 {rooms} 间房。",
            adults: "成人",
            children: "儿童",
            rooms: "房间",
            adultsHint: "18岁及以上",
            childrenHint: "18岁以下",
            roomsHint: "建议房间数量",
            done: "搜索酒店",
            doneDate: "应用日期",
            decrease: "减少",
            increase: "增加",
            totalGuests: "位住客",
            nights: "晚",
            searchPath: "/hotel/catalog",
            destinationOptions: [
              { value: "巴厘岛", sublabel: "印度尼西亚" },
              { value: "雅加达", sublabel: "印度尼西亚" },
              { value: "新加坡", sublabel: "新加坡" },
              { value: "曼谷", sublabel: "泰国" },
              { value: "东京", sublabel: "日本" },
              { value: "拉布安巴佐", sublabel: "印度尼西亚" },
            ],
          }
        : {
            destination: "Destinasi",
            checkin: "Check-in",
            checkout: "Check-out",
            guests: "Tamu & Kamar",
            destinationPlaceholder: "Cari destinasi atau area hotel",
            destinationTitle: "Destinasi stay populer",
            destinationHint: "Pilih kota atau area menginap agar hasil hotel lebih cepat terarah.",
            checkinTitle: "Tanggal check-in",
            checkoutTitle: "Tanggal check-out",
            dateHint: "Atur tanggal menginap untuk memperjelas ketersediaan kamar.",
            guestsTitle: "Pengaturan tamu & kamar",
            guestsSub: "Atur jumlah dewasa, anak, dan kamar untuk stay yang lebih pas.",
            guestsCapacityHint: "Minimal {rooms} kamar untuk kombinasi tamu ini.",
            adults: "Dewasa",
            children: "Anak",
            rooms: "Kamar",
            adultsHint: "Usia 18+",
            childrenHint: "Di bawah 18 tahun",
            roomsHint: "Jumlah kamar yang direkomendasikan",
            done: "Cari Hotel",
            doneDate: "Pakai Tanggal",
            decrease: "Kurangi",
            increase: "Tambah",
            totalGuests: "Tamu total",
            nights: "malam",
            searchPath: "/hotel/catalog",
            destinationOptions: [
              { value: "Bali", sublabel: "Indonesia" },
              { value: "Jakarta", sublabel: "Indonesia" },
              { value: "Singapore", sublabel: "Singapore" },
              { value: "Bangkok", sublabel: "Thailand" },
              { value: "Tokyo", sublabel: "Japan" },
              { value: "Labuan Bajo", sublabel: "Indonesia" },
            ],
          }

  const [destination, setDestination] = useState(copy.destinationOptions[0])
  const [checkin, setCheckin] = useState("2026-05-27")
  const [checkout, setCheckout] = useState("2026-05-30")
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [rooms, setRooms] = useState(1)

  const displayedRooms = Math.max(rooms, Math.max(1, Math.ceil(adults / 2), Math.ceil((adults + children) / 3)))
  const nightsCount = Math.max(1, Math.round((new Date(`${checkout}T00:00:00`).getTime() - new Date(`${checkin}T00:00:00`).getTime()) / 86400000))
  const searchHref = useMemo(() => {
    const params = new URLSearchParams()
    params.set("q", destination.value)
    params.set("checkin", checkin)
    params.set("checkout", checkout)
    params.set("adults", String(adults))
    params.set("children", String(children))
    params.set("rooms", String(displayedRooms))
    return `${copy.searchPath}?${params.toString()}`
  }, [adults, checkin, checkout, copy.searchPath, destination.value, displayedRooms, children])

  function updateCheckin(value: string) {
    setCheckin(value)
    if (checkout <= value) {
      setCheckout(addDays(value, 1))
    }
  }

  function updateCheckout(value: string) {
    if (value > checkin) {
      setCheckout(value)
      return
    }
    setCheckout(addDays(checkin, 1))
  }

  return (
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.92fr)_minmax(0,0.92fr)_minmax(0,1fr)_56px]">
      <DestinationField copy={copy} value={destination.value} sublabel={destination.sublabel} onPick={setDestination} />
      <DateField
        title={copy.checkin}
        helper={copy.dateHint}
        value={checkin}
        sublabel={formatWeekday(checkin, locale)}
        withLeftBorder
        onChange={updateCheckin}
        doneLabel={copy.doneDate}
      />
      <DateField
        title={copy.checkout}
        helper={`${nightsCount} ${copy.nights}`}
        value={checkout}
        sublabel={formatWeekday(checkout, locale)}
        withLeftBorder
        min={addDays(checkin, 1)}
        onChange={updateCheckout}
        doneLabel={copy.doneDate}
      />
      <GuestsRoomsField
        locale={locale}
        copy={copy}
        adults={adults}
        childrenCount={children}
        rooms={rooms}
        onAdultsChange={setAdults}
        onChildrenChange={setChildren}
        onRoomsChange={setRooms}
        searchHref={searchHref}
      />

      <a
        href={searchHref}
        aria-label={buttonLabel}
        className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff6541_0%,#ef4423_100%)] px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_18px_34px_-18px_rgba(239,68,35,0.82)] transition hover:brightness-105 xl:mt-1 xl:h-[56px] xl:w-[56px] xl:self-center xl:px-0 xl:py-0"
      >
        <SearchIcon />
      </a>
    </div>
  )
}
