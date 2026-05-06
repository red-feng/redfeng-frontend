import Link from "next/link"

import {
  BusIcon,
  BuildingIcon,
  MenuIcon,
  PlaneIcon,
  SparklesIcon,
  TrainIcon,
} from "@/app/components/home/homeContent"

const quickChips = [
  "Aktivasi TPayLater",
  "Promo China",
  "Hotel Jakarta",
  "Tour Grup",
]

const services = [
  { label: "Hotel", tone: "bg-[#225ea8]", Icon: BuildingIcon },
  { label: "Pesawat", tone: "bg-[#39c6f4]", Icon: PlaneIcon },
  { label: "Aktivitas", tone: "bg-[#ff6b74]", Icon: SparklesIcon },
  { label: "Kereta", tone: "bg-[#ffb100]", Icon: TrainIcon },
  { label: "Bus", tone: "bg-[#2dc84f]", Icon: BusIcon },
  { label: "Kapal", tone: "bg-[#ff8b8b]", Icon: ShipMiniIcon },
  { label: "Flight + Hotel", tone: "bg-[#8f2bc2]", Icon: FlightHotelIcon },
  { label: "Transfer", tone: "bg-[#1ab7b0]", Icon: TransferIcon },
  { label: "Paket", tone: "bg-[#a11f44]", Icon: PackageMiniIcon },
  { label: "TPayLater", tone: "bg-[#164b88]", Icon: WalletMiniIcon },
]

export default function HomeStandaloneMobileHero() {
  return (
    <section className="standalone-home-top relative md:hidden">
      <div className="rounded-b-[38px] bg-[linear-gradient(180deg,#1aa6f4_0%,#1197eb_58%,#0b8ce2_100%)] px-4 pb-20 pt-[calc(env(safe-area-inset-top)+0.85rem)] shadow-[0_18px_40px_-28px_rgba(17,151,235,0.72)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-14 flex-1 items-center gap-3 rounded-full bg-white px-5 text-left shadow-[0_14px_28px_-22px_rgba(15,23,42,0.3)]"
          >
            <SearchIcon className="h-6 w-6 shrink-0 text-slate-300" />
            <span className="truncate text-[15px] font-medium text-slate-500">Cari hotel, tiket, atau destinasi</span>
          </button>
          <button type="button" className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-white" aria-label="Promo">
            <PercentCircleIcon className="h-8 w-8" />
            <span className="absolute right-[2px] top-[2px] h-2.5 w-2.5 rounded-full bg-[#ff6a00]" />
          </button>
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white" aria-label="Chat">
            <ChatBubbleIcon className="h-7 w-7" />
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickChips.map((chip, index) => (
            <button
              key={chip}
              type="button"
              className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold shadow-[0_12px_24px_-20px_rgba(15,23,42,0.28)] ${
                index === 0 ? "bg-[#0f7dcc] text-white" : "bg-[#119ef0] text-white/95"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between px-1">
          <Link href="/" className="text-[12px] font-semibold tracking-[0.22em] text-white/88">
            REDFENG TRAVEL APP
          </Link>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white/90 backdrop-blur-sm"
            aria-label="Menu tambahan"
          >
            <MenuIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mx-4 -mt-10 rounded-[30px] bg-white px-4 pb-5 pt-6 shadow-[0_20px_44px_-28px_rgba(15,23,42,0.24)]">
        <div className="grid grid-cols-5 gap-x-2 gap-y-7">
          {services.map(({ label, tone, Icon }) => (
            <button key={label} type="button" className="flex flex-col items-center text-center">
              <span className={`flex h-[3.9rem] w-[3.9rem] items-center justify-center rounded-full text-white shadow-[0_18px_28px_-24px_rgba(15,23,42,0.35)] ${tone}`}>
                <Icon className="h-7 w-7" />
              </span>
              <span className="mt-3 text-[11px] font-medium leading-4 text-slate-900">{label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#19a6f4]" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        </div>
      </div>
    </section>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function PercentCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="m9.2 14.8 5.6-5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="9.2" r="1.1" fill="currentColor" />
      <circle cx="15" cy="14.8" r="1.1" fill="currentColor" />
    </svg>
  )
}

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 17.5 7.5 15A6.8 6.8 0 1 1 12 18.8H7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ShipMiniIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 15.5h14l-1.7 2.6H6.7L5 15.5Zm4-6h6l1 6H8l1-6Zm1.2-2.5h3.6v2.5h-3.6V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

function FlightHotelIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5.5 18V8.5A1.5 1.5 0 0 1 7 7h6.5V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 10h2M8 13h2M15 8l5-1.2-4 5.2 3.2 2.1-1.2 1.2-3.8-1.3V18h-1.5V12.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TransferIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 14.5 7.8 10a1.8 1.8 0 0 1 1.7-1.1h5a1.8 1.8 0 0 1 1.7 1.1l1.8 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 15h14v3a1.5 1.5 0 0 1-1.5 1.5H16V18H8v1.5H6.5A1.5 1.5 0 0 1 5 18V15Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="8" cy="15" r="1" fill="currentColor" />
      <circle cx="16" cy="15" r="1" fill="currentColor" />
    </svg>
  )
}

function PackageMiniIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5.5 8 12 4.5 18.5 8 12 11.5 5.5 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M5.5 8v8L12 19.5 18.5 16V8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 11.5V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function WalletMiniIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 8.5A2.5 2.5 0 0 1 7.5 6H17a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7.5A2.5 2.5 0 0 1 5 15.5v-7Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 9.5H17M14.5 13h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
