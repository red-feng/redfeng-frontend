import Link from "next/link"
import FavoriteButton from "@/app/components/favorites/FavoriteButton"
import HomeSectionHeader from "@/app/components/home/shared/HomeSectionHeader"
import { StarIcon } from "@/app/components/home/shared/homeContent"
import { popularBookingCatalog } from "@/app/components/home/shared/homeDetailCatalog"
import type { Locale } from "@/lib/i18n"
import { formatHomePriceFromIdr } from "@/lib/home-pricing"

export default function WebHomePopularSection({ locale }: { locale: Locale }) {
  const copy = {
    id: {
      title: "Paling Banyak Dipesan",
      from: "Contoh katalog",
      perNight: "/malam",
    },
    en: {
      title: "Most Booked",
      from: "Sample catalog",
      perNight: "/night",
    },
    zh: {
      title: "最多人预订",
      from: "起价",
      perNight: "/晚",
    },
  }[locale]

  const localizedItems = {
    id: [
      { category: "Pesawat", title: "Jakarta -> Bali", subtitle: "Contoh rute katalog" },
      { category: "Hotel", title: "The Trans Resort Bali", subtitle: "Contoh properti katalog" },
      { category: "Paket Wisata", title: "Bali 3 Hari 2 Malam", subtitle: "Termasuk Hotel & Tour" },
      { category: "Kereta", title: "Jakarta -> Bandung", subtitle: "Contoh rute katalog" },
      { category: "Hotel", title: "AYANA Resort Bali", subtitle: "Contoh properti katalog" },
    ],
    en: [
      { category: "Flights", title: "Jakarta -> Bali", subtitle: "Sample catalog route" },
      { category: "Hotel", title: "The Trans Resort Bali", subtitle: "Sample catalog property" },
      { category: "Tour Packages", title: "Bali 3 Days 2 Nights", subtitle: "Hotel & Tour Included" },
      { category: "Train", title: "Jakarta -> Bandung", subtitle: "Sample catalog route" },
      { category: "Hotel", title: "AYANA Resort Bali", subtitle: "Sample catalog property" },
    ],
    zh: [
      { category: "机票", title: "雅加达 -> 巴厘岛", subtitle: "单程" },
      { category: "酒店", title: "The Trans Resort Bali", subtitle: "库塔，巴厘岛" },
      { category: "旅游套餐", title: "巴厘岛 3天2晚", subtitle: "含酒店与行程" },
      { category: "火车", title: "雅加达 -> 万隆", subtitle: "WHOOSH 高铁" },
      { category: "酒店", title: "AYANA Resort Bali", subtitle: "金巴兰，巴厘岛" },
    ],
  }[locale]
  const localizedPrices = [0, 0, 1990000, 0, 0]

  return (
    <div className="home-popular-block">
      <HomeSectionHeader title={copy.title} showTabs locale={locale} />
      <section className="home-popular-section mx-auto max-w-[1240px] px-4 pb-10 sm:px-6 lg:px-8 lg:pb-12">
        <div className="home-popular-grid flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-5">
          {popularBookingCatalog.map((item, index) => {
            const localized = localizedItems[index]
            const localizedPrice = formatHomePriceFromIdr(localizedPrices[index] || 0, locale)

            return (
              <article key={item.title} className="home-popular-card flex h-full w-[138px] min-w-[138px] flex-col overflow-hidden rounded-[18px] border border-[#ebedf3] bg-white shadow-[0_20px_42px_-34px_rgba(15,23,42,0.2)] md:w-auto md:min-w-0">
                <div className="home-popular-media relative h-[112px] overflow-hidden md:h-[152px]">
                  <Link href={item.detailHref} className="absolute inset-0 z-[1]">
                    <span className="sr-only">{localized?.title || item.title}</span>
                  </Link>
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${item.image}')` }} />
                  <FavoriteButton
                    item={{
                      key: item.favoriteKey,
                      title: localized?.title || item.title,
                      subtitle: localized?.subtitle || item.subtitle,
                      href: item.detailHref,
                      meta: `${localized?.category || item.category} • ${localizedPrice}${item.suffix ? locale === "id" ? item.suffix : copy.perNight : ""}`,
                    }}
                    className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/92 text-slate-700 shadow-sm"
                    iconClassName="h-3.5 w-3.5"
                  />
                </div>
                <Link href={item.detailHref} className="home-popular-body flex flex-1 flex-col p-4 md:px-4 md:pt-4 md:pb-[18px]">
                  <span className={`inline-flex rounded-[6px] px-2.5 py-1 text-[10px] font-medium leading-none ${item.tone}`}>
                    {localized?.category || item.category}
                  </span>
                  <div className="mt-3 flex flex-1 flex-col">
                    <h3 className="home-popular-title text-[14px] font-semibold leading-[1.22] tracking-[-0.015em] text-slate-900 md:text-[17px] md:leading-[1.2]">
                      {localized?.title || item.title}
                    </h3>
                    <p className="home-popular-copy text-[12px] leading-[1.2] text-slate-500">
                      {localized?.subtitle || item.subtitle}
                    </p>
                    <div className="pb-2 pt-1">
                      <div className="flex items-center gap-1 text-[12px] font-medium leading-none text-slate-700">
                        <StarIcon className="h-3 w-3 text-[#f5a623]" />
                        {item.rating}
                      </div>
                    </div>
                    <div className="mt-auto pt-1">
                      <p className="home-popular-copy text-[11px] leading-none text-slate-400">{copy.from}</p>
                      <div className="mt-0.5 flex min-h-[32px] items-end justify-between gap-2">
                        <p className="text-[14px] font-bold leading-[1.15] tracking-[-0.02em] text-slate-900 md:text-[17px]">
                          {localizedPrice}
                          {item.suffix ? (
                            <span className="ml-1 text-[11px] font-medium leading-none text-slate-500">
                              {locale === "id" ? item.suffix : copy.perNight}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
