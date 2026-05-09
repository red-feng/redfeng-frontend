import Image from "next/image"
import Link from "next/link"
import type { Locale } from "@/lib/i18n"

import { appHomeConfig, ArrowRightIcon } from "@/app/components/home/shared/homeContent"
import { recentActivityDetail } from "@/app/components/home/shared/homeDetailCatalog"

export default function AppHomeRecentActivitySection({ locale }: { locale: Locale }) {
  const copy = {
    id: {
      eyebrow: "Lanjutkan",
      title: "Aktivitas terakhirmu",
      opened: "Baru dibuka",
      cta: "Selengkapnya",
      filters: appHomeConfig.recentFilters,
    },
    en: {
      eyebrow: "Continue",
      title: "Your recent activity",
      opened: "Recently opened",
      cta: "See details",
      filters: ["Flights", "Hotels"],
    },
    zh: {
      eyebrow: "继续浏览",
      title: "你最近的活动",
      opened: "最近打开",
      cta: "查看更多",
      filters: ["机票", "酒店"],
    },
  }[locale]
  const localizedActivity = {
    id: {
      category: recentActivityDetail.category,
      title: recentActivityDetail.title,
      subtitle: recentActivityDetail.subtitle,
      suffix: recentActivityDetail.suffix,
    },
    en: {
      category: "Flights",
      title: "Jakarta -> Bali",
      subtitle: "One Way",
      suffix: "",
    },
    zh: {
      category: "机票",
      title: "雅加达 -> 巴厘岛",
      subtitle: "单程",
      suffix: "",
    },
  }[locale]

  return (
    <div className="mt-4 rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#fffdfb_100%)] px-4 py-4 shadow-[0_24px_42px_-34px_rgba(15,23,42,0.18)] ring-1 ring-[#edf1f6]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-900">{copy.eyebrow}</p>
          <h2 className="mt-1 text-[14px] font-semibold leading-[1.32] tracking-normal text-slate-950 lg:text-[15px]">{copy.title}</h2>
        </div>
        <Link href={recentActivityDetail.detailHref} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef7ff] text-[#1098ec] shadow-[0_14px_24px_-20px_rgba(16,152,236,0.4)]">
          <ArrowRightIcon className="h-5 w-5" />
        </Link>
      </div>

      <div className="mt-4 flex gap-3">
        {copy.filters.map((label, index) => (
          <button
            key={label}
            type="button"
            className={`rounded-full border px-5 py-3 text-[13px] font-semibold transition ${
              index === 0
                ? "border-[#ff5b4d] bg-white text-[#ef3b2d] shadow-[0_12px_22px_-18px_rgba(239,91,42,0.32)]"
                : "border-[#dfe8f3] bg-[#f8fbff] text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <article className="mt-4 overflow-hidden rounded-[26px] border border-[#edf1f7] bg-white shadow-[0_20px_40px_-30px_rgba(15,23,42,0.14)]">
        <div className="flex">
          <div className="relative w-[38%] overflow-hidden bg-[linear-gradient(135deg,#6257ff_0%,#15b8ff_100%)]">
            <Image src={recentActivityDetail.image} alt={localizedActivity.title} fill className="object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.38)_100%)]" />
            <div className="absolute left-3 top-3 rounded-full bg-white/18 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {localizedActivity.category}
            </div>
          </div>
          <div className="flex-1 px-4 py-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">{copy.opened}</p>
            <p className="mt-2 text-[15px] font-bold leading-5 text-slate-900">{localizedActivity.title}</p>
            <p className="mt-2 text-[13px] leading-5 text-slate-500">
              {localizedActivity.subtitle}
              {localizedActivity.suffix ? ` ${localizedActivity.suffix}` : ""}
            </p>
            <Link
              href={recentActivityDetail.detailHref}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d8dee8] bg-[#f8fafc] px-4 py-3 text-[13px] font-semibold text-slate-900 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.14)]"
            >
              {copy.cta}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>
    </div>
  )
}
