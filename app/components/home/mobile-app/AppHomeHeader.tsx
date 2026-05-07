import Image from "next/image"
import Link from "next/link"

import { appHomeConfig } from "@/app/components/home/shared/homeContent"

export default function AppHomeHeader() {
  return (
    <div className="relative overflow-hidden rounded-b-[56px] px-3.5 pb-[11.5rem] pt-[calc(env(safe-area-inset-top)+1.05rem)] shadow-[0_28px_48px_-32px_rgba(15,23,42,0.26)]">
      <Image
        src="/home-assets/hero-header-background.png"
        alt="Pemandangan pegunungan untuk hero RedFeng"
        fill
        priority
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,252,248,0.12)_0%,rgba(255,255,255,0.02)_32%,rgba(255,255,255,0)_64%,rgba(255,255,255,0.08)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_right,rgba(64,170,255,0.24),transparent_46%)]" />
      <div className="absolute left-[-16%] top-[18%] h-44 w-44 rounded-full bg-white/30 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.14)_100%)]" />

      <div className="relative z-10 flex items-center gap-2.5">
        <Link
          href="/search"
          className="flex h-[3.75rem] min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-full border border-white/75 bg-white/76 px-5 text-left text-[#6a879d] shadow-[0_18px_28px_-22px_rgba(15,23,42,0.2)] backdrop-blur-md"
        >
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden text-sky-500">
            <SearchIcon className="h-[22px] w-[22px]" />
          </span>
          <span className="truncate text-[15px] font-medium text-slate-500">Cari hotel, tiket, atau destinasi</span>
        </Link>
        <Link
          href="/promo"
          className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/75 bg-white/74 text-sky-500 shadow-[0_18px_28px_-22px_rgba(15,23,42,0.2)] backdrop-blur-md"
          aria-label="Promo"
        >
          <PercentCircleIcon className="h-8 w-8" />
          <span className="absolute right-[4px] top-[4px] h-2.5 w-2.5 rounded-full bg-[#ff6a00]" />
        </Link>
        <Link
          href="/chat"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/75 bg-white/74 text-sky-500 shadow-[0_18px_28px_-22px_rgba(15,23,42,0.2)] backdrop-blur-md"
          aria-label="Chat"
        >
          <ChatBubbleIcon className="h-7 w-7" />
        </Link>
      </div>

      <div className="relative z-10 pt-[0.7rem]">
        <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {appHomeConfig.quickChips.map((chip, index) => (
            <Link
              key={chip}
              href="/promo"
              className={`shrink-0 rounded-full px-6 py-[0.72rem] text-[12px] font-semibold shadow-[0_14px_24px_-20px_rgba(15,23,42,0.18)] ${
                index === 0
                  ? "bg-[linear-gradient(180deg,#ff6a45_0%,#ef5b2a_100%)] text-white shadow-[0_16px_26px_-20px_rgba(239,91,42,0.48)]"
                  : "border border-white/75 bg-white/74 text-slate-900 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.16)] backdrop-blur-md"
              }`}
            >
              {chip}
            </Link>
          ))}
        </div>
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
