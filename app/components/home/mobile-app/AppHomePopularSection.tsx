import Link from "next/link"

import { ArrowRightIcon, bookingTabs, HeartIcon, popularBookings, StarIcon } from "@/app/components/home/shared/homeContent"

export default function AppHomePopularSection() {
  return (
    <section className="rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#fffdfb_100%)] px-4 py-4 shadow-[0_24px_42px_-34px_rgba(15,23,42,0.18)] ring-1 ring-[#edf1f6]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-500">Paling laris</p>
          <h2 className="mt-1 text-[1.2rem] font-bold tracking-[-0.035em] text-slate-950">Paling Banyak Dipesan</h2>
        </div>
        <Link
          href="/packages"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef7ff] text-[#1098ec] shadow-[0_14px_24px_-20px_rgba(16,152,236,0.4)]"
        >
          <ArrowRightIcon className="h-5 w-5" />
        </Link>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {bookingTabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            className={`shrink-0 rounded-full border px-4 py-2.5 text-[12px] font-semibold ${
              index === 0
                ? "border-[#ff5b4d] bg-white text-[#ef3b2d] shadow-[0_12px_20px_-18px_rgba(239,91,42,0.4)]"
                : "border-[#e6edf5] bg-white text-slate-500"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {popularBookings.map((item) => (
          <article
            key={item.title}
            className="flex w-[15.25rem] min-w-[15.25rem] flex-col overflow-hidden rounded-[24px] border border-[#ebedf3] bg-white shadow-[0_20px_42px_-34px_rgba(15,23,42,0.2)]"
          >
            <div className="relative h-[11.25rem] overflow-hidden">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${item.image}')` }} />
              <button
                type="button"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-slate-700 shadow-sm"
              >
                <HeartIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <span className={`inline-flex w-fit rounded-[8px] px-2.5 py-1 text-[10px] font-medium leading-none ${item.tone}`}>{item.category}</span>

              <div className="mt-3 flex flex-1 flex-col">
                <h3 className="text-[15px] font-semibold leading-[1.22] tracking-[-0.015em] text-slate-900">{item.title}</h3>
                <p className="mt-1 text-[13px] leading-[1.25] text-slate-500">{item.subtitle}</p>

                <div className="pt-2">
                  <div className="flex items-center gap-1 text-[12px] font-medium leading-none text-slate-700">
                    <StarIcon className="h-3 w-3 text-[#f5a623]" />
                    {item.rating}
                  </div>
                </div>

                <div className="mt-auto pt-4">
                  <p className="text-[11px] leading-none text-slate-400">Mulai dari</p>
                  <p className="mt-1 text-[15px] font-bold leading-[1.15] tracking-[-0.02em] text-slate-900">
                    {item.price}
                    {item.suffix ? <span className="ml-1 text-[11px] font-medium leading-none text-slate-500">{item.suffix}</span> : null}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
