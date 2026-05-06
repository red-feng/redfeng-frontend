import Image from "next/image"

import {
  appHomeFeaturedActivity,
  appHomeFeaturedPromo,
  appHomeRecentFilters,
  ArrowRightIcon,
  HeartIcon,
} from "@/app/components/home/homeContent"

export default function HomeStandaloneMobileFeed() {
  return (
    <section className="standalone-home-feed hidden px-4 pb-4 md:hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-[1.05rem] font-bold tracking-[-0.03em] text-slate-950">Promo pilihan untukmu</h2>
        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef7ff] text-[#1098ec]">
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>

      <article className="mt-4 overflow-hidden rounded-[26px] border border-[#edf1f7] bg-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.18)]">
        <div className="bg-[linear-gradient(180deg,#fbffd8_0%,#fffef3_100%)] px-5 pb-5 pt-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#17a0f3] text-white shadow-[0_16px_28px_-20px_rgba(23,160,243,0.45)]">
              <DiscountBirdIcon className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[1.1rem] font-bold tracking-[-0.03em] text-slate-950">{appHomeFeaturedPromo.price}</h3>
                  <p className="mt-1 text-[14px] leading-5 text-slate-500">{appHomeFeaturedPromo.title.replace(/\n/g, " ")}</p>
                </div>
                <button type="button" className="text-slate-400">
                  <InfoIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 flex items-center gap-2 text-[12px] font-medium text-slate-500">
                <span>{appHomeFeaturedPromo.eyebrow}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ef5b2a] text-white">
                  <HeartIcon className="h-4 w-4" />
                </span>
                {appHomeFeaturedPromo.badge ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-500">{appHomeFeaturedPromo.badge}</span> : null}
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
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#169ef1] px-5 py-3 text-[13px] font-bold text-white shadow-[0_16px_26px_-20px_rgba(22,158,241,0.52)]"
            >
              {appHomeFeaturedPromo.cta}
              <ClockIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>

      <div className="mt-8">
        <h2 className="text-[1.05rem] font-bold tracking-[-0.03em] text-slate-950">Aktivitas terakhirmu</h2>
        <div className="mt-4 flex gap-3">
          {appHomeRecentFilters.map((label, index) => (
            <button
              key={label}
              type="button"
              className={`rounded-full px-5 py-3 text-[13px] font-bold ${
                index === 0 ? "bg-[#169ef1] text-white" : "bg-[#eef7ff] text-[#169ef1]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <article className="mt-4 overflow-hidden rounded-[24px] border border-[#edf1f7] bg-white shadow-[0_16px_34px_-28px_rgba(15,23,42,0.18)]">
          <div className="flex">
            <div className="relative w-[34%] overflow-hidden bg-[linear-gradient(135deg,#6257ff_0%,#15b8ff_100%)]">
              <Image src={appHomeFeaturedActivity.image} alt={appHomeFeaturedActivity.title} fill className="object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.38)_100%)]" />
              <div className="absolute left-3 top-3 rounded-full bg-white/18 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                {appHomeFeaturedActivity.category}
              </div>
            </div>
            <div className="flex-1 px-4 py-4">
              <p className="text-[15px] font-bold leading-5 text-slate-900">{appHomeFeaturedActivity.title}</p>
              <p className="mt-1 text-[13px] text-slate-500">
                {appHomeFeaturedActivity.subtitle}
                {appHomeFeaturedActivity.suffix ? ` ${appHomeFeaturedActivity.suffix}` : ""}
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#169ef1] px-4 py-2.5 text-[13px] font-bold text-white"
              >
                Selengkapnya
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
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
