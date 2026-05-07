import Link from "next/link"
import HomeSectionHeader from "@/app/components/home/shared/HomeSectionHeader"
import { HeartIcon, StarIcon } from "@/app/components/home/shared/homeContent"
import { popularBookingCatalog } from "@/app/components/home/shared/homeDetailCatalog"

export default function WebHomePopularSection() {
  return (
    <div className="home-popular-block">
      <HomeSectionHeader title="Paling Banyak Dipesan" showTabs />
      <section className="home-popular-section mx-auto max-w-[1240px] px-4 pb-10 sm:px-6 lg:px-8 lg:pb-12">
        <div className="home-popular-grid flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-5">
          {popularBookingCatalog.map((item) => (
            <Link key={item.title} href={item.detailHref} className="home-popular-card flex h-full w-[138px] min-w-[138px] flex-col overflow-hidden rounded-[18px] border border-[#ebedf3] bg-white shadow-[0_20px_42px_-34px_rgba(15,23,42,0.2)] md:w-auto md:min-w-0">
              <div className="home-popular-media relative h-[112px] overflow-hidden md:h-[152px]">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${item.image}')` }} />
                <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/92 text-slate-700 shadow-sm">
                  <HeartIcon className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="home-popular-body flex flex-1 flex-col p-4 md:px-4 md:pt-4 md:pb-[18px]">
                <span className={`inline-flex rounded-[6px] px-2.5 py-1 text-[10px] font-medium leading-none ${item.tone}`}>{item.category}</span>
                <div className="mt-3 flex flex-1 flex-col">
                  <h3 className="home-popular-title text-[14px] font-semibold leading-[1.22] tracking-[-0.015em] text-slate-900 md:text-[17px] md:leading-[1.2]">{item.title}</h3>
                  <p className="home-popular-copy text-[12px] leading-[1.2] text-slate-500">{item.subtitle}</p>
                  <div className="pt-1 pb-2">
                    <div className="flex items-center gap-1 text-[12px] font-medium leading-none text-slate-700">
                      <StarIcon className="h-3 w-3 text-[#f5a623]" />
                      {item.rating}
                    </div>
                  </div>
                  <div className="mt-auto pt-1">
                    <p className="home-popular-copy text-[11px] leading-none text-slate-400">Mulai dari</p>
                    <div className="mt-0.5 flex min-h-[32px] items-end justify-between gap-2">
                      <p className="text-[14px] font-bold leading-[1.15] tracking-[-0.02em] text-slate-900 md:text-[17px]">
                        {item.price}
                        {item.suffix ? <span className="ml-1 text-[11px] font-medium leading-none text-slate-500">{item.suffix}</span> : null}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
