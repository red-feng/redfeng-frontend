import { appHomeConfig } from "@/app/components/home/shared/homeContent"

export default function AppHomeHeader() {
  return (
    <div className="relative overflow-hidden bg-[url('/home-assets/hero-header-background-1.jpg')] bg-cover bg-center px-1 pb-[9.4rem] pt-[calc(env(safe-area-inset-top)+0.7rem)] shadow-[0_24px_40px_-30px_rgba(15,23,42,0.22)]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.06)_18%,rgba(255,255,255,0.02)_40%,rgba(255,255,255,0.08)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.05)_42%,rgba(255,255,255,0.12)_100%)]" />

      <div className="relative z-10 flex items-center gap-2 px-3">
        <button
          type="button"
          className="flex h-[4.55rem] min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-[1.9rem] bg-white/68 px-6 text-left text-[#6a879d] ring-1 ring-white/85 shadow-[0_16px_28px_-22px_rgba(15,23,42,0.2)] backdrop-blur-md"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden text-[#169ef1]">
            <SearchIcon className="h-7 w-7" />
          </span>
          <span className="truncate text-[17px] font-semibold tracking-[-0.02em] text-white [text-shadow:0_1px_2px_rgba(15,23,42,0.18)]">
            Cari hotel, tiket, atau destinasi
          </span>
        </button>
        <button
          type="button"
          className="relative inline-flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white/18 text-[#169ef1] shadow-[0_14px_24px_-20px_rgba(15,23,42,0.2)] backdrop-blur-md"
          aria-label="Promo"
        >
          <PercentCircleIcon className="h-[2.2rem] w-[2.2rem]" />
          <span className="absolute right-[2px] top-[2px] h-3 w-3 rounded-full bg-[#ff6a00]" />
        </button>
        <button
          type="button"
          className="inline-flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white/18 text-[#169ef1] shadow-[0_14px_24px_-20px_rgba(15,23,42,0.2)] backdrop-blur-md"
          aria-label="Chat"
        >
          <ChatBubbleIcon className="h-[2rem] w-[2rem]" />
        </button>
      </div>

      <div className="relative z-10 pt-5">
        <div className="flex gap-3 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {appHomeConfig.quickChips.map((chip, index) => (
            <button
              key={chip}
              type="button"
              className={`shrink-0 rounded-[1.75rem] px-7 py-[1.05rem] text-[12px] font-semibold shadow-[0_18px_28px_-22px_rgba(15,23,42,0.22)] ${
                index === 0
                  ? "bg-[linear-gradient(180deg,#ff6a45_0%,#ef5b2a_100%)] text-white shadow-[0_18px_30px_-22px_rgba(239,91,42,0.52)]"
                  : "border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(182,197,202,0.74)_100%)] text-[#2f80ed] backdrop-blur-md"
              }`}
            >
              {chip}
            </button>
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
