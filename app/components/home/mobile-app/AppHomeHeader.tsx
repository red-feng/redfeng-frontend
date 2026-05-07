import { appHomeConfig } from "@/app/components/home/shared/homeContent"

export default function AppHomeHeader() {
  return (
    <div className="relative overflow-hidden rounded-b-[48px] bg-[linear-gradient(180deg,#fff8f4_0%,#fffdfb_42%,#f6fbff_100%)] px-3.5 pb-[5.75rem] pt-[calc(env(safe-area-inset-top)+1.05rem)] shadow-[0_24px_40px_-30px_rgba(15,23,42,0.16)] ring-1 ring-[#eef2f7]">
      <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_right,rgba(94,185,255,0.18),transparent_44%)]" />
      <div className="absolute -left-14 top-20 h-44 w-44 rounded-full bg-[#ffe6d8]/70 blur-3xl" />
      <div className="absolute right-[-2.5rem] top-24 h-40 w-40 rounded-full bg-[#dff2ff]/85 blur-3xl" />

      <div className="relative z-10 flex items-center gap-2.5">
        <button
          type="button"
          className="flex h-[3.6rem] min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-full bg-[linear-gradient(180deg,#ffffff_0%,#fffaf7_100%)] px-5 text-left text-[#6a879d] ring-1 ring-[#dbe9f6] shadow-[0_14px_24px_-20px_rgba(15,23,42,0.12)]"
        >
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden text-sky-500">
            <SearchIcon className="h-[22px] w-[22px]" />
          </span>
          <span className="truncate text-[15px] font-medium text-slate-500">Cari hotel, tiket, atau destinasi</span>
        </button>
        <button
          type="button"
          className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d8ecff] bg-[linear-gradient(180deg,#eef8ff_0%,#f9fcff_100%)] text-sky-500 shadow-[0_14px_24px_-20px_rgba(16,152,236,0.24)]"
          aria-label="Promo"
        >
          <PercentCircleIcon className="h-8 w-8" />
          <span className="absolute right-[4px] top-[4px] h-2.5 w-2.5 rounded-full bg-[#ff6a00]" />
        </button>
        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d8ecff] bg-[linear-gradient(180deg,#eef8ff_0%,#f9fcff_100%)] text-sky-500 shadow-[0_14px_24px_-20px_rgba(16,152,236,0.24)]"
          aria-label="Chat"
        >
          <ChatBubbleIcon className="h-7 w-7" />
        </button>
      </div>

      <div className="relative z-10 pt-[0.7rem]">
        <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {appHomeConfig.quickChips.map((chip, index) => (
            <button
              key={chip}
              type="button"
              className={`shrink-0 rounded-full px-6 py-[0.7rem] text-[12px] font-semibold shadow-[0_12px_24px_-20px_rgba(15,23,42,0.18)] ${
                index === 0
                  ? "bg-[linear-gradient(180deg,#ff6a45_0%,#ef5b2a_100%)] text-white shadow-[0_16px_26px_-20px_rgba(239,91,42,0.48)]"
                  : "border border-[#d8ecff] bg-[linear-gradient(180deg,#eef8ff_0%,#f9fcff_100%)] text-[#3b82f6] shadow-[0_12px_24px_-22px_rgba(16,152,236,0.24)]"
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
