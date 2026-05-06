import { appHomeConfig, ArrowRightIcon, HeartIcon } from "@/app/components/home/shared/homeContent"

export default function AppHomePromoSection() {
  return (
    <div className="rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#fffdfb_100%)] px-4 py-4 shadow-[0_24px_42px_-34px_rgba(15,23,42,0.18)] ring-1 ring-[#edf1f6]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-500">Promo aktif</p>
          <h2 className="mt-1 text-[1.2rem] font-bold tracking-[-0.035em] text-slate-950">Promo pilihan untukmu</h2>
        </div>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef7ff] text-[#1098ec] shadow-[0_14px_24px_-20px_rgba(16,152,236,0.4)]">
          <ArrowRightIcon className="h-5 w-5" />
        </button>
      </div>

      <article className="mt-4 overflow-hidden rounded-[28px] border border-[#edf1f7] bg-white shadow-[0_20px_40px_-30px_rgba(15,23,42,0.14)]">
        <div className="bg-[linear-gradient(180deg,#fbffd8_0%,#fffef3_100%)] px-5 pb-5 pt-5">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[#17a0f3] text-white shadow-[0_16px_28px_-20px_rgba(23,160,243,0.45)]">
              <DiscountBirdIcon className="h-9 w-9" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[1.7rem] font-bold tracking-[-0.05em] text-slate-950">{appHomeConfig.featuredPromo.price}</h3>
                  <p className="mt-1 text-[15px] leading-5 text-slate-600">{appHomeConfig.featuredPromo.title.replace(/\n/g, " ")}</p>
                </div>
                <button type="button" className="text-slate-400">
                  <InfoIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px] font-medium text-slate-500">
                <span>{appHomeConfig.featuredPromo.eyebrow}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ef5b2a] text-white">
                  <HeartIcon className="h-4 w-4" />
                </span>
                {appHomeConfig.featuredPromo.badge ? (
                  <span className="rounded-full bg-[#eef2ff] px-3 py-2 text-[11px] font-semibold text-slate-500">{appHomeConfig.featuredPromo.badge}</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-[#eef2f7] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-[#10a23c]">Ambil sebelum kehabisan</p>
              <div className="mt-3 h-3 rounded-full bg-slate-100">
                <div className="h-3 w-[62%] rounded-full bg-[#10b43f]" />
              </div>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#169ef1] px-5 py-3.5 text-[14px] font-bold text-white shadow-[0_16px_26px_-20px_rgba(22,158,241,0.52)]"
            >
              {appHomeConfig.featuredPromo.cta}
              <ClockIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}

function DiscountBirdIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M5.7 14.8c3.3-1.1 5.9-3.8 7.9-8.1 2.1 1 3.8 2.6 4.8 4.6-3.4 1.4-6.2 3.8-8.2 7.2-1.9-.7-3.4-1.8-4.5-3.7Z" />
      <path d="M4.4 16.1c3.5.8 6.5.4 9-1.1-1.5 2.7-3.7 4.7-6.7 5.9-.9-1.2-1.7-2.7-2.3-4.8Z" />
    </svg>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v4M12 8.2h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v5l3 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
