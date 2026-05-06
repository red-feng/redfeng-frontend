import Link from "next/link"
import { ArrowRightIcon, bookingTabs } from "@/app/components/home/shared/homeContent"

type HomeSectionHeaderProps = {
  title: string
  showTabs?: boolean
}

export default function HomeSectionHeader({ title, showTabs = false }: HomeSectionHeaderProps) {
  return (
    <section className={`home-section-header mx-auto max-w-[1240px] px-4 pb-5 ${showTabs ? "pt-3" : "pt-7"} sm:px-6 lg:px-8`}>
      <div className="home-section-header-shell flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="home-section-header-title text-[22px] font-bold tracking-[-0.03em] text-slate-900 lg:text-[26px]">{title}</h2>
          <Link href="/packages" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#3b82f6] lg:hidden">
            Lihat semua
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
        {showTabs ? (
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="home-section-header-tabs flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap">
              {bookingTabs.map((tab, index) => (
                <button
                  key={tab}
                  className={`home-section-header-tab shrink-0 rounded-full border px-5 py-2 text-[13px] font-medium leading-none transition ${
                    index === 0 ? "border-[#ff5b4d] bg-white text-[#ef3b2d]" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <Link href="/packages" className="hidden items-center gap-2 text-[14px] font-semibold text-[#3b82f6] lg:inline-flex">
              Lihat semua
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <Link href="/packages" className="hidden items-center gap-2 text-[14px] font-semibold text-[#3b82f6] lg:inline-flex">
            Lihat semua
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        )}
      </div>
    </section>
  )
}
