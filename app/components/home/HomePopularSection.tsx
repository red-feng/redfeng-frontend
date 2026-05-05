import HomeSectionHeader from "@/app/components/home/HomeSectionHeader"
import { HeartIcon, popularBookings, StarIcon } from "@/app/components/home/homeContent"

export default function HomePopularSection() {
  return (
    <>
      <HomeSectionHeader title="Paling Banyak Dipesan" showTabs />
      <section className="home-popular-section mx-auto max-w-[1240px] px-4 pb-10 sm:px-6 lg:px-8 lg:pb-12">
        <div className="home-popular-grid flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-5">
          {popularBookings.map((item) => (
            <article key={item.title} className="home-popular-card flex h-full w-[138px] min-w-[138px] flex-col overflow-hidden rounded-[18px] border border-[#ebedf3] bg-white shadow-[0_20px_42px_-34px_rgba(15,23,42,0.2)] md:w-auto md:min-w-0">
              <div className="home-popular-media relative h-[112px] overflow-hidden md:h-[152px]">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${item.image}')` }} />
                <button className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/92 text-slate-700 shadow-sm">
                  <HeartIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="home-popular-body flex flex-1 flex-col p-3.5 md:p-4">
                <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${item.tone}`}>{item.category}</span>
                <h3 className="home-popular-title mt-3 min-h-[56px] text-[14px] font-semibold leading-[1.3] tracking-[-0.02em] text-slate-900 md:min-h-[46px] md:text-[17px]">{item.title}</h3>
                <p className="home-popular-copy mt-1 min-h-[36px] text-[12px] text-slate-500">{item.subtitle}</p>
                <div className="mt-auto pt-4">
                  <p className="home-popular-copy text-[11px] text-slate-400">Mulai dari</p>
                  <div className="mt-1 flex min-h-[44px] items-end justify-between gap-2">
                    <p className="text-[14px] font-bold leading-tight text-slate-900 md:text-[17px]">
                      {item.price}
                      {item.suffix ? <span className="ml-1 text-[11px] font-medium text-slate-500">{item.suffix}</span> : null}
                    </p>
                    <div className="flex items-center gap-1 text-[12px] font-medium text-slate-700">
                      <StarIcon className="h-3 w-3 text-[#f5a623]" />
                      {item.rating}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
