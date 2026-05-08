"use client"

import Link from "next/link"
import { useRef } from "react"

import FavoriteButton from "@/app/components/favorites/FavoriteButton"
import { ArrowRightIcon } from "@/app/components/home/shared/homeContent"
import { promoCatalog } from "@/app/components/promo/promoCatalog"

export default function WebHomePromoSection() {
  const trackRef = useRef<HTMLDivElement>(null)

  const scrollByCard = (direction: "prev" | "next") => {
    const track = trackRef.current

    if (!track) return

    const firstCard = track.querySelector<HTMLElement>("[data-promo-card]")
    const gap = 18
    const cardWidth = firstCard?.offsetWidth ?? Math.max(track.clientWidth * 0.82, 280)
    const delta = direction === "next" ? cardWidth + gap : -(cardWidth + gap)

    track.scrollBy({ left: delta, behavior: "smooth" })
  }

  return (
    <section className="home-promo-section relative mx-auto max-w-[1240px] px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-7 lg:pb-12">
      <div className="relative">
        <button
          type="button"
          onClick={() => scrollByCard("prev")}
          className="absolute left-3 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white shadow-[0_18px_36px_-24px_rgba(15,23,42,0.45)] backdrop-blur-sm transition-colors hover:bg-white/18 lg:flex"
          aria-label="Promo sebelumnya"
        >
          <ArrowRightIcon className="h-5 w-5 rotate-180" />
        </button>
        <button
          type="button"
          onClick={() => scrollByCard("next")}
          className="absolute right-3 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white shadow-[0_18px_36px_-24px_rgba(15,23,42,0.45)] backdrop-blur-sm transition-colors hover:bg-white/18 lg:flex"
          aria-label="Promo berikutnya"
        >
          <ArrowRightIcon className="h-5 w-5" />
        </button>
        <div
          ref={trackRef}
          className="home-promo-track flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:gap-[18px]"
        >
          {promoCatalog.map((card, index) => (
            <article
              key={card.title}
              data-promo-card
            className="home-promo-card group relative flex min-h-[286px] w-[302px] min-w-[302px] snap-start flex-col overflow-hidden rounded-[26px] bg-slate-900 px-6 py-6 text-white shadow-[0_28px_70px_-42px_rgba(15,23,42,0.42)] transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-0.5 hover:shadow-[0_34px_74px_-42px_rgba(15,23,42,0.46)] sm:min-h-[320px] sm:w-[356px] sm:min-w-[356px] sm:px-6 sm:py-6 lg:min-h-[332px] lg:w-[390px] lg:min-w-[390px] xl:w-[408px] xl:min-w-[408px] xl:px-7 xl:py-7"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
              <div className={`absolute inset-0 scale-[1.005] bg-no-repeat transition-transform duration-700 ease-out group-hover:scale-[1.028] ${card.imageClass}`} style={{ backgroundImage: `url('${card.image}')` }} />
              <div className={`absolute inset-0 ${card.overlayClass}`} />
              <div className={`absolute inset-0 ${card.glowClass}`} />
              <div className="absolute inset-x-0 bottom-0 h-[58%] bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.14)_46%,rgba(15,23,42,0.28)_100%)]" />
              {index > 0 ? (
                <FavoriteButton
                  item={{
                    key: card.favoriteKey,
                    title: card.title.replace(/\n/g, " "),
                    subtitle: card.price,
                    href: card.detailHref,
                    meta: "Promo",
                  }}
                  className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/8 text-white backdrop-blur-sm transition-colors hover:bg-white/16"
                  iconClassName="h-4 w-4"
                />
              ) : null}
              <div className={`relative z-10 flex h-full flex-col ${index === 0 ? "max-w-[220px] sm:max-w-[232px]" : "max-w-[232px] sm:max-w-[242px]"}`}>
                {card.badge ? (
                  <span className="inline-flex w-fit rounded-full bg-white px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ff5b4d] shadow-[0_10px_22px_-18px_rgba(255,255,255,0.9)]">
                    {card.badge}
                  </span>
                ) : null}
                <h3 className="mt-7 whitespace-pre-line text-[19px] font-bold leading-[1.1] tracking-[-0.035em] sm:text-[24px]">
                  {card.title}
                </h3>
                <div className="mt-auto pt-8">
                  <p className="text-[13px] font-medium leading-none text-white/88">{card.eyebrow}</p>
                  <p className="mt-2 text-[17px] font-bold leading-none tracking-[-0.03em] sm:text-[19px]">{card.price}</p>
                </div>
                <Link
                  href={card.detailHref}
                  className="mt-5 w-fit rounded-[14px] bg-white px-5 py-3 text-[13px] font-semibold text-slate-950 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.45)] transition-transform duration-200 hover:scale-[1.02]"
                >
                  {card.cta}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
