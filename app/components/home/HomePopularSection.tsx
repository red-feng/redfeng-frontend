import HomeSectionHeader from "@/app/components/home/HomeSectionHeader"
import { HeartIcon, popularBookings, StarIcon } from "@/app/components/home/homeContent"

export default function HomePopularSection() {
  return (
    <>
      <HomeSectionHeader title="Paling Banyak Dipesan" showTabs />
      <section className="home-popular-section mx-auto max-w-[1240px] px-4 pb-4 sm:px-6 lg:px-8">
        <div className="home-popular-grid flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-5">
          {popularBookings.map((item) => (
            <article key={item.title} className="home-popular-card w-[138px] min-w-[138px] overflow-hidden rounded-[18px] border border-[#ebedf3] bg-white shadow-[0_20px_42px_-34px_rgba(15,23,42,0.2)] md:w-auto md:min-w-0">
              <div className="home-popular-media relative h-[112px] overflow-hidden md:h-[152px]">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${item.image}')` }} />
                <button className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/92 text-slate-700 shadow-sm">
                  <HeartIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="home-popular-body p-3.5 md:p-4">
                <span className={`rounded-md px-2 py-1 text-[9px] font-semibold ${item.tone}`}>{item.category}</span>
                <h3 className="home-popular-title mt-3 text-[12px] font-bold tracking-[-0.03em] text-slate-900 md:text-[18px]">{item.title}</h3>
                <p className="home-popular-copy mt-1 text-[11px] text-slate-500">{item.subtitle}</p>
                <p className="home-popular-copy mt-3 text-[10px] text-slate-400">Mulai dari</p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <p className="text-[11px] font-black text-slate-900 md:text-[18px]">
                    {item.price}
                    {item.suffix ? <span className="ml-1 text-[10px] font-medium text-slate-500">{item.suffix}</span> : null}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                    <StarIcon className="h-3 w-3 text-[#f5a623]" />
                    {item.rating}
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
