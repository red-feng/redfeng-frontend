import Image from "next/image"

import { appHomeConfig, ArrowRightIcon } from "@/app/components/home/homeContent"

export default function AppHomeRecentActivitySection() {
  return (
    <div className="mt-8">
      <h2 className="text-[1.05rem] font-bold tracking-[-0.03em] text-slate-950">Aktivitas terakhirmu</h2>
      <div className="mt-4 flex gap-3">
        {appHomeConfig.recentFilters.map((label, index) => (
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
            <Image src={appHomeConfig.featuredActivity.image} alt={appHomeConfig.featuredActivity.title} fill className="object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.38)_100%)]" />
            <div className="absolute left-3 top-3 rounded-full bg-white/18 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {appHomeConfig.featuredActivity.category}
            </div>
          </div>
          <div className="flex-1 px-4 py-4">
            <p className="text-[15px] font-bold leading-5 text-slate-900">{appHomeConfig.featuredActivity.title}</p>
            <p className="mt-1 text-[13px] text-slate-500">
              {appHomeConfig.featuredActivity.subtitle}
              {appHomeConfig.featuredActivity.suffix ? ` ${appHomeConfig.featuredActivity.suffix}` : ""}
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
  )
}
