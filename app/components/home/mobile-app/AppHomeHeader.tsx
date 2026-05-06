import { appHomeConfig } from "@/app/components/home/shared/homeContent"

export default function AppHomeHeader() {
  return (
    <div className="px-3.5 pt-[calc(env(safe-area-inset-top)+0.8rem)]">
      <div className="relative z-20 flex items-center gap-3">
        <button
          type="button"
          className="flex h-14 flex-1 items-center gap-3 rounded-full bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 text-left shadow-[0_20px_34px_-24px_rgba(15,23,42,0.26)] ring-1 ring-white/80"
        >
          <SearchIcon className="h-6 w-6 shrink-0 text-slate-300" />
          <span className="truncate text-[15px] font-medium text-slate-500">Cari hotel, tiket, atau destinasi</span>
        </button>
        <button
          type="button"
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/42 bg-transparent text-white"
          aria-label="Promo"
        >
          <PercentCircleIcon className="h-8 w-8" />
          <span className="absolute right-[2px] top-[2px] h-2.5 w-2.5 rounded-full bg-[#ff6a00]" />
        </button>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/42 bg-transparent text-white"
          aria-label="Chat"
        >
          <ChatBubbleIcon className="h-7 w-7" />
        </button>
      </div>

      <div className="relative -mt-5 overflow-hidden rounded-b-[42px] bg-[linear-gradient(180deg,#30b2f8_0%,#1a9ceb_50%,#0f88dd_100%)] px-0 pb-16 pt-16 shadow-[0_24px_42px_-30px_rgba(13,136,221,0.52)]">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_42%)]" />
        <div className="absolute -left-12 top-24 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-[-2.5rem] top-32 h-36 w-36 rounded-full bg-[#5fd2ff]/18 blur-3xl" />

        <div className="relative flex gap-2 overflow-x-auto px-3.5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {appHomeConfig.quickChips.map((chip, index) => (
            <button
              key={chip}
              type="button"
              className={`shrink-0 rounded-full px-5 py-2.5 text-[12px] font-semibold shadow-[0_12px_24px_-20px_rgba(15,23,42,0.18)] ${
                index === 0 ? "bg-[#0a79cb] text-white" : "bg-[#1496ea] text-white/92"
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
