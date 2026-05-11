import Image from "next/image"
import Link from "next/link"

import { appHeaderLock } from "@/app/components/home/shared/appHeaderLock"
import { appHomeConfig } from "@/app/components/home/shared/homeContent"

export default function AppHomeHeader() {
  return (
    <div className={appHeaderLock.containerClass}>
      <Image
        src="/home-assets/hero-header-background.png"
        alt="Pemandangan pegunungan untuk hero RedFeng"
        fill
        priority
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,252,248,0.12)_0%,rgba(255,255,255,0.04)_28%,rgba(255,255,255,0)_60%,rgba(255,255,255,0.14)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_right,rgba(64,170,255,0.18),transparent_46%)]" />
      <div className="absolute left-[-16%] top-[18%] h-40 w-40 rounded-full bg-white/24 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.18)_100%)]" />

      <div className={appHeaderLock.actionRowClass}>
        <Link
          href="/search"
          className={appHeaderLock.searchTriggerClass}
        >
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden text-sky-500">
            <SearchIcon className="h-[22px] w-[22px]" />
          </span>
          <span className="truncate text-[15px] font-medium text-slate-500">Cari hotel, tiket, atau destinasi</span>
        </Link>
        <Link
          href="/promo"
          className={`relative ${appHeaderLock.utilityButtonClass}`}
          aria-label="Promo"
        >
          <PercentCircleIcon className="h-8 w-8" />
          <span className="absolute right-[4px] top-[4px] h-2.5 w-2.5 rounded-full bg-[#ff6a00]" />
        </Link>
        <Link
          href="/chat"
          className={appHeaderLock.utilityButtonClass}
          aria-label="Chat"
        >
          <ChatBubbleIcon className="h-7 w-7" />
        </Link>
      </div>

      <div className="relative z-10 pt-5">
        <div className="rounded-[1.9rem] border border-white/65 bg-white/18 px-4 py-4 text-white shadow-[0_18px_30px_-26px_rgba(15,23,42,0.24)] backdrop-blur-[6px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">RedFeng App</p>
          <h1 className="mt-2 max-w-[16rem] text-[1.7rem] font-semibold leading-[1.02] tracking-[-0.045em]">
            Semua kebutuhan perjalanan dalam satu layar
          </h1>
          <p className="mt-2 max-w-[18rem] text-[12px] leading-5 text-white/82">
            Buka tiket, hotel, aktivitas, dan paket wisata lebih cepat lewat menu utama yang langsung siap dipakai.
          </p>
        </div>
      </div>

      <div className="relative z-10 pt-3">
        <div className={appHeaderLock.chipsWrapClass}>
          {appHomeConfig.quickChips.map((chip, index) => (
            <Link
              key={chip}
              href="/promo"
              className={`shrink-0 rounded-full px-4.5 py-[0.62rem] text-[11px] font-semibold shadow-[0_14px_24px_-20px_rgba(15,23,42,0.18)] ${
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
