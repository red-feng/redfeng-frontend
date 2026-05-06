import Link from "next/link"

import { appHomeConfig, MenuIcon } from "@/app/components/home/shared/homeContent"

export default function AppHomeHeader() {
  return (
    <div className="relative overflow-hidden rounded-b-[34px] bg-[linear-gradient(180deg,#24adf8_0%,#1598ec_58%,#0d88dd_100%)] px-4 pb-16 pt-[calc(env(safe-area-inset-top)+0.8rem)] shadow-[0_18px_36px_-28px_rgba(13,136,221,0.6)]">
      <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_42%)]" />

      <div className="relative flex items-center gap-3">
        <button
          type="button"
          className="flex h-14 flex-1 items-center gap-3 rounded-full bg-white px-5 text-left shadow-[0_14px_28px_-22px_rgba(15,23,42,0.3)]"
        >
          <SearchIcon className="h-6 w-6 shrink-0 text-slate-300" />
          <span className="truncate text-[15px] font-medium text-slate-500">Cari hotel, tiket, atau destinasi</span>
        </button>
        <button
          type="button"
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/22 bg-white/10 text-white backdrop-blur-sm"
          aria-label="Promo"
        >
          <PercentCircleIcon className="h-8 w-8" />
          <span className="absolute right-[2px] top-[2px] h-2.5 w-2.5 rounded-full bg-[#ff6a00]" />
        </button>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/22 bg-white/10 text-white backdrop-blur-sm"
          aria-label="Chat"
        >
          <ChatBubbleIcon className="h-7 w-7" />
        </button>
      </div>

      <div className="relative mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {appHomeConfig.quickChips.map((chip, index) => (
          <button
            key={chip}
            type="button"
            className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold shadow-[0_12px_24px_-20px_rgba(15,23,42,0.28)] ${
              index === 0 ? "bg-[#0a78ca] text-white" : "bg-[#1092e7] text-white/95"
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full border border-white/24 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/88 backdrop-blur-sm">
            RedFeng Travel App
          </span>
          <p className="mt-3 max-w-[220px] text-[14px] font-medium leading-5 text-white/88">
            Cari, bandingkan, dan pesan layanan perjalanan favoritmu lebih cepat.
          </p>
        </div>
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/24 bg-white/10 text-white shadow-[0_12px_24px_-20px_rgba(15,23,42,0.35)] backdrop-blur-sm"
          aria-label="Menu tambahan"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="relative mt-4 flex items-center justify-between rounded-[20px] border border-white/16 bg-white/10 px-4 py-3 backdrop-blur-sm">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/72">Promo hari ini</p>
          <p className="mt-1 text-[13px] font-semibold text-white">Diskon baru dan penawaran aktif dari RedFeng</p>
        </div>
        <Link href="/" className="shrink-0 text-[11px] font-semibold tracking-[0.2em] text-white/90">
          REDFENG
        </Link>
      </div>
    </div>
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
