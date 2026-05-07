import Link from "next/link"

import { ArrowRightIcon, HeartIcon, promoCards } from "@/app/components/home/shared/homeContent"

export default function AppHomePromoSection() {
  return (
    <div className="rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#fffdfb_100%)] px-4 py-4 shadow-[0_24px_42px_-34px_rgba(15,23,42,0.18)] ring-1 ring-[#edf1f6]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-900">Promo aktif</p>
          <h2 className="mt-1 text-[14px] font-semibold leading-[1.32] tracking-normal text-slate-950 lg:text-[15px]">Promo pilihan untukmu</h2>
        </div>
        <Link href="/promo" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef7ff] text-[#1098ec] shadow-[0_14px_24px_-20px_rgba(16,152,236,0.4)]">
          <ArrowRightIcon className="h-5 w-5" />
        </Link>
      </div>

      <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {promoCards.map((card, index) => (
          <article
            key={card.title}
            className="relative flex min-h-[232px] w-[286px] min-w-[286px] snap-start flex-col overflow-hidden rounded-[28px] px-5 py-5 text-white shadow-[0_22px_42px_-28px_rgba(15,23,42,0.26)]"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
            <div
              className={`absolute inset-0 bg-no-repeat ${card.imageClass}`}
              style={{ backgroundImage: `url('${card.image}')` }}
            />
            <div className={`absolute inset-0 ${card.overlayClass}`} />
            <div className={`absolute inset-0 ${card.glowClass}`} />
            <div className="absolute inset-x-0 bottom-0 h-[52%] bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.14)_46%,rgba(15,23,42,0.32)_100%)]" />

            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                {card.badge ? (
                  <span className="inline-flex w-fit rounded-full bg-white px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ff5b4d] shadow-[0_10px_22px_-18px_rgba(255,255,255,0.9)]">
                    {card.badge}
                  </span>
                ) : (
                  <span />
                )}

                {index > 0 ? (
                  <button className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/8 text-white backdrop-blur-sm transition-colors hover:bg-white/16">
                    <HeartIcon className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="mt-6 max-w-[195px]">
                <h3 className="whitespace-pre-line text-[22px] font-bold leading-[1.08] tracking-[-0.04em]">
                  {card.title}
                </h3>
              </div>

              <div className="mt-auto">
                <p className="text-[12px] font-medium leading-none text-white/88">{card.eyebrow}</p>
                <p className="mt-2 text-[22px] font-bold leading-none tracking-[-0.04em]">{card.price}</p>
                <Link
                  href="/promo"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-[13px] font-semibold text-slate-950 shadow-[0_18px_30px_-22px_rgba(15,23,42,0.4)]"
                >
                  {card.cta}
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
