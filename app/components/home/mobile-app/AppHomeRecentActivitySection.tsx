import Image from "next/image"

import { appHomeConfig, ArrowRightIcon } from "@/app/components/home/shared/homeContent"

export default function AppHomeRecentActivitySection() {
  return (
    <div className="mt-4 rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#fffdfb_100%)] px-4 py-4 shadow-[0_24px_42px_-34px_rgba(15,23,42,0.18)] ring-1 ring-[#edf1f6]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-500">Lanjutkan</p>
          <h2 className="mt-1 text-[18px] font-bold tracking-[-0.03em] text-slate-950">Aktivitas terakhirmu</h2>
        </div>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef7ff] text-[#1098ec] shadow-[0_14px_24px_-20px_rgba(16,152,236,0.4)]">
          <ArrowRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 flex gap-3">
        {appHomeConfig.recentFilters.map((label, index) => (
          <button
            key={label}
            type="button"
            className={`rounded-full border px-5 py-3 text-[13px] font-semibold transition ${
              index === 0
                ? "border-[#ff5b4d] bg-white text-[#ef3b2d] shadow-[0_12px_22px_-18px_rgba(239,91,42,0.32)]"
                : "border-[#dfe8f3] bg-[#f8fbff] text-[#607187]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <article className="mt-4 overflow-hidden rounded-[26px] border border-[#edf1f7] bg-white shadow-[0_20px_40px_-30px_rgba(15,23,42,0.14)]">
        <div className="flex">
          <div className="relative w-[38%] overflow-hidden bg-[linear-gradient(135deg,#6257ff_0%,#15b8ff_100%)]">
            <Image src={appHomeConfig.featuredActivity.image} alt={appHomeConfig.featuredActivity.title} fill className="object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.38)_100%)]" />
            <div className="absolute left-3 top-3 rounded-full bg-white/18 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {appHomeConfig.featuredActivity.category}
            </div>
          </div>
          <div className="flex-1 px-4 py-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">Baru dibuka</p>
            <p className="mt-2 text-[15px] font-bold leading-5 text-slate-900">{appHomeConfig.featuredActivity.title}</p>
            <p className="mt-2 text-[13px] leading-5 text-slate-500">
              {appHomeConfig.featuredActivity.subtitle}
              {appHomeConfig.featuredActivity.suffix ? ` ${appHomeConfig.featuredActivity.suffix}` : ""}
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#cfe3ff] bg-[#f5f9ff] px-4 py-3 text-[13px] font-semibold text-[#2f80ed] shadow-[0_14px_24px_-22px_rgba(47,128,237,0.24)]"
            >
              Selengkapnya
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}
