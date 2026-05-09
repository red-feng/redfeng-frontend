import Link from "next/link"
import FavoriteButton from "@/app/components/favorites/FavoriteButton"
import HomeSectionHeader from "@/app/components/home/shared/HomeSectionHeader"
import { destinationCatalog } from "@/app/components/home/shared/homeDetailCatalog"
import type { Locale } from "@/lib/i18n"

export default function HomeDestinationsSection({ locale }: { locale: Locale }) {
  const copy = {
    id: { title: "Destinasi Populer" },
    en: { title: "Popular Destinations" },
    zh: { title: "热门目的地" },
  }[locale]
  const localizedDestinations = {
    id: [
      { country: "Indonesia", teaser: "Mulai dari Rp 1,2 Jt" },
      { country: "Indonesia", teaser: "Mulai dari Rp 600 rb" },
      { country: "Jepang", teaser: "Mulai dari Rp 3,5 Jt" },
      { country: "Singapura", teaser: "Mulai dari Rp 2,1 Jt" },
      { country: "Thailand", teaser: "Mulai dari Rp 1,8 Jt" },
      { country: "Indonesia", teaser: "Mulai dari Rp 1,3 Jt" },
    ],
    en: [
      { country: "Indonesia", teaser: "Starting from Rp 1.2M" },
      { country: "Indonesia", teaser: "Starting from Rp 600K" },
      { country: "Japan", teaser: "Starting from Rp 3.5M" },
      { country: "Singapore", teaser: "Starting from Rp 2.1M" },
      { country: "Thailand", teaser: "Starting from Rp 1.8M" },
      { country: "Indonesia", teaser: "Starting from Rp 1.3M" },
    ],
    zh: [
      { country: "印度尼西亚", teaser: "起价 Rp 1.2M" },
      { country: "印度尼西亚", teaser: "起价 Rp 600K" },
      { country: "日本", teaser: "起价 Rp 3.5M" },
      { country: "新加坡", teaser: "起价 Rp 2.1M" },
      { country: "泰国", teaser: "起价 Rp 1.8M" },
      { country: "印度尼西亚", teaser: "起价 Rp 1.3M" },
    ],
  }[locale]

  return (
    <div className="-mt-10 md:mt-0">
      <HomeSectionHeader title={copy.title} locale={locale} />
      <section className="home-destinations-section mx-auto max-w-[1240px] px-4 pb-8 sm:px-6 lg:px-8 lg:pb-10">
        <div className="home-destinations-grid flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-6">
          {destinationCatalog.map((destination, index) => {
            const localized = localizedDestinations[index]
            return (
            <article key={destination.name} className="home-destinations-card group relative h-[150px] w-[106px] min-w-[106px] overflow-hidden rounded-[18px] shadow-[0_18px_34px_-28px_rgba(15,23,42,0.3)] sm:h-[160px] sm:w-auto sm:min-w-0">
              <Link href={destination.detailHref} className="absolute inset-0 z-[1]">
                <span className="sr-only">{destination.name}</span>
              </Link>
                <div className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${destination.image}')` }} />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.82)_100%)]" />
                <FavoriteButton
                  item={{
                    key: destination.favoriteKey,
                    title: destination.name,
                    subtitle: localized?.country || destination.country,
                    href: destination.detailHref,
                    meta: localized?.teaser || destination.teaser,
                  }}
                  className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur sm:hidden"
                  iconClassName="h-3.5 w-3.5"
                />
              <div className="home-destinations-body absolute inset-x-4 bottom-4 text-white">
                <h3 className="home-destinations-title text-[12px] font-semibold leading-none tracking-normal sm:text-[18px]">{destination.name}</h3>
                <p className="home-destinations-copy mt-1 text-[10px] font-medium text-white/95 sm:text-[10px]">{localized?.country || destination.country}</p>
                <p className="home-destinations-copy mt-1 hidden text-[11px] text-white/80 sm:block">{localized?.teaser || destination.teaser}</p>
              </div>
            </article>
          )})}
        </div>
      </section>
    </div>
  )
}
