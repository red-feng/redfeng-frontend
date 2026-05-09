import Link from "next/link"
import type { Locale } from "@/lib/i18n"

import FavoriteButton from "@/app/components/favorites/FavoriteButton"
import { ArrowRightIcon, StarIcon } from "@/app/components/home/shared/homeContent"
import { popularBookingCatalog } from "@/app/components/home/shared/homeDetailCatalog"
import { formatHomePriceFromIdr } from "@/lib/home-pricing"

export default function AppHomePopularSection({ locale }: { locale: Locale }) {
  const copy = {
    id: {
      eyebrow: "Paling laris",
      title: "Paling Banyak Dipesan",
      from: "Mulai dari",
      perNight: "/malam",
      favoriteSeparator: "•",
      tabs: ["Semua", "Pesawat", "Hotel", "Paket Wisata", "Kereta"],
    },
    en: {
      eyebrow: "Best sellers",
      title: "Most Booked",
      from: "Starting from",
      perNight: "/night",
      favoriteSeparator: "•",
      tabs: ["All", "Flights", "Hotels", "Tour Packages", "Train"],
    },
    zh: {
      eyebrow: "热销精选",
      title: "最多人预订",
      from: "起价",
      perNight: "/晚",
      favoriteSeparator: "•",
      tabs: ["全部", "机票", "酒店", "旅游套餐", "火车"],
    },
  }[locale]

  const localizedItems = {
    id: [
      { category: "Pesawat", title: "Jakarta -> Bali", subtitle: "Sekali Jalan" },
      { category: "Hotel", title: "The Trans Resort Bali", subtitle: "Kuta, Bali" },
      { category: "Paket Wisata", title: "Bali 3 Hari 2 Malam", subtitle: "Termasuk Hotel & Tour" },
      { category: "Kereta", title: "Jakarta -> Bandung", subtitle: "Kereta Cepat WHOOSH" },
      { category: "Hotel", title: "AYANA Resort Bali", subtitle: "Jimbaran, Bali" },
    ],
    en: [
      { category: "Flights", title: "Jakarta -> Bali", subtitle: "One Way" },
      { category: "Hotel", title: "The Trans Resort Bali", subtitle: "Kuta, Bali" },
      { category: "Tour Packages", title: "Bali 3 Days 2 Nights", subtitle: "Hotel & Tour Included" },
      { category: "Train", title: "Jakarta -> Bandung", subtitle: "WHOOSH High-Speed Rail" },
      { category: "Hotel", title: "AYANA Resort Bali", subtitle: "Jimbaran, Bali" },
    ],
    zh: [
      { category: "机票", title: "雅加达 -> 巴厘岛", subtitle: "单程" },
      { category: "酒店", title: "The Trans Resort Bali", subtitle: "库塔，巴厘岛" },
      { category: "旅游套餐", title: "巴厘岛 3天2晚", subtitle: "含酒店与行程" },
      { category: "火车", title: "雅加达 -> 万隆", subtitle: "WHOOSH 高铁" },
      { category: "酒店", title: "AYANA Resort Bali", subtitle: "金巴兰，巴厘岛" },
    ],
  }[locale]
  const localizedPrices = [690000, 850000, 1990000, 150000, 2350000]

  return (
    <section className="rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#fffdfb_100%)] px-4 py-4 shadow-[0_24px_42px_-34px_rgba(15,23,42,0.18)] ring-1 ring-[#edf1f6]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-900">{copy.eyebrow}</p>
          <h2 className="mt-1 text-[14px] font-semibold leading-[1.32] tracking-normal text-slate-950 lg:text-[15px]">{copy.title}</h2>
        </div>
        <Link
          href="/packages"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef7ff] text-[#1098ec] shadow-[0_14px_24px_-20px_rgba(16,152,236,0.4)]"
        >
          <ArrowRightIcon className="h-5 w-5" />
        </Link>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {copy.tabs.map((tab, index) => (
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
        {popularBookingCatalog.map((item, index) => {
          const localized = localizedItems[index]
          const localizedPrice = formatHomePriceFromIdr(localizedPrices[index] || 0, locale)

          return (
            <article
              key={item.title}
              className="flex w-[15.25rem] min-w-[15.25rem] flex-col overflow-hidden rounded-[24px] border border-[#ebedf3] bg-white shadow-[0_20px_42px_-34px_rgba(15,23,42,0.2)]"
            >
              <div className="relative h-[11.25rem] overflow-hidden">
                <Link href={item.detailHref} className="absolute inset-0">
                  <span className="sr-only">{localized?.title || item.title}</span>
                </Link>
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${item.image}')` }} />
                <FavoriteButton
                  item={{
                    key: item.favoriteKey,
                    title: localized?.title || item.title,
                    subtitle: localized?.subtitle || item.subtitle,
                    href: item.detailHref,
                    meta: `${localized?.category || item.category} ${copy.favoriteSeparator} ${localizedPrice}${item.suffix ? locale === "id" ? item.suffix : copy.perNight : ""}`,
                  }}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-slate-700 shadow-sm"
                  iconClassName="h-4 w-4"
                />
              </div>

              <Link href={item.detailHref} className="flex flex-1 flex-col p-4">
                <span className={`inline-flex w-fit rounded-[8px] px-2.5 py-1 text-[10px] font-medium leading-none ${item.tone}`}>
                  {localized?.category || item.category}
                </span>

                <div className="mt-3 flex flex-1 flex-col">
                  <h3 className="text-[15px] font-semibold leading-[1.22] tracking-[-0.015em] text-slate-900">{localized?.title || item.title}</h3>
                  <p className="mt-1 text-[13px] leading-[1.25] text-slate-500">{localized?.subtitle || item.subtitle}</p>

                  <div className="pt-2">
                    <div className="flex items-center gap-1 text-[12px] font-medium leading-none text-slate-700">
                      <StarIcon className="h-3 w-3 text-[#f5a623]" />
                      {item.rating}
                    </div>
                  </div>

                  <div className="mt-auto pt-4">
                    <p className="text-[11px] leading-none text-slate-400">{copy.from}</p>
                    <p className="mt-1 text-[15px] font-bold leading-[1.15] tracking-[-0.02em] text-slate-900">
                      {localizedPrice}
                      {item.suffix ? <span className="ml-1 text-[11px] font-medium leading-none text-slate-500">{locale === "id" ? item.suffix : copy.perNight}</span> : null}
                    </p>
                  </div>
                </div>
              </Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}
