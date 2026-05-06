import {
  BusIcon,
  BuildingIcon,
  CardIcon,
  PlaneIcon,
  ShipIcon,
  SparklesIcon,
  TrainIcon,
} from "@/app/components/home/homeContent"

const quickChips = [
  "Aktivasi TPayLater",
  "Shakti Capsule Hotel Jakarta",
  "Tiket ke Bali",
  "Promo keluarga",
]

const serviceItems = [
  { label: "Hotel", color: "bg-[#235ea8]", Icon: BuildingIcon },
  { label: "Tiket Pesawat", color: "bg-[#3bc7f5]", Icon: PlaneIcon },
  { label: "Xperience", color: "bg-[#ff6b73]", Icon: SparklesIcon },
  { label: "Tiket Kereta Api", color: "bg-[#ffb100]", Icon: TrainIcon },
  { label: "Tiket Bus & Travel", color: "bg-[#2ec84f]", Icon: BusIcon },
  { label: "Cruises", color: "bg-[#ff8b8b]", Icon: ShipIcon },
  { label: "Pesawat + Hotel", color: "bg-[#8b2ab8]", Icon: PlaneIcon },
  { label: "Transfer & Rental", color: "bg-[#21b7b0]", Icon: CarIcon },
  { label: "Whoosh", color: "bg-[#a11e42]", Icon: TrainIcon },
  { label: "TPayLater", color: "bg-[#184b88]", Icon: CardIcon },
]

export default function HomeStandaloneMobileHero() {
  return (
    <section className="standalone-home-top relative md:hidden">
      <div className="rounded-b-[40px] bg-[linear-gradient(180deg,#1fb2ff_0%,#0e95ea_62%,#0a82df_100%)] px-4 pb-16 pt-[calc(env(safe-area-inset-top)+0.9rem)] shadow-[0_20px_46px_-32px_rgba(14,149,234,0.75)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-14 flex-1 items-center gap-3 rounded-full bg-white px-5 text-left text-slate-400 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.45)]"
          >
            <SearchIcon className="h-6 w-6 shrink-0" />
            <span className="truncate text-[15px] font-medium text-slate-500">Louis Kienne Pemuda</span>
          </button>
          <button
            type="button"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm"
            aria-label="Promo"
          >
            <PercentIcon className="h-7 w-7" />
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#ff6a00]" />
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm"
            aria-label="Chat"
          >
            <ChatIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickChips.map((chip, index) => (
            <button
              key={chip}
              type="button"
              className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold shadow-[0_14px_24px_-22px_rgba(15,23,42,0.45)] ${
                index === 0 ? "bg-[#0e75c9] text-white" : "bg-[#1397ef] text-white/92"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 mx-4 -mt-8 rounded-[32px] bg-white px-4 pb-5 pt-6 shadow-[0_22px_44px_-30px_rgba(15,23,42,0.24)]">
        <div className="grid grid-cols-5 gap-x-2 gap-y-7">
          {serviceItems.map(({ label, color, Icon }) => (
            <button key={label} type="button" className="flex flex-col items-center text-center">
              <span className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_18px_28px_-22px_rgba(15,23,42,0.45)] ${color}`}>
                <Icon className="h-8 w-8" />
              </span>
              <span className="mt-3 text-[11px] font-medium leading-4 text-slate-800">{label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1ea7ff]" />
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

function PercentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="m9 15 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" />
      <circle cx="15" cy="15" r="1.2" fill="currentColor" />
    </svg>
  )
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6.5 18.5 7 15.5a7 7 0 1 1 3.8 2.2L6.5 18.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function CarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 14.5 7.7 10a2 2 0 0 1 1.9-1.3h4.8a2 2 0 0 1 1.9 1.3l1.7 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 15h14v3.5A1.5 1.5 0 0 1 17.5 20H16v-1.5H8V20H6.5A1.5 1.5 0 0 1 5 18.5V15Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="8" cy="15" r="1" fill="currentColor" />
      <circle cx="16" cy="15" r="1" fill="currentColor" />
      <path d="M12 6.5V4M12 6.5l-1.5-1.5M12 6.5 13.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
