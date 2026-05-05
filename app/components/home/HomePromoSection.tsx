import { HeartIcon, promoCards } from "@/app/components/home/homeContent"

export default function HomePromoSection() {
  return (
    <section className="home-promo-section mx-auto max-w-[1240px] px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-7 lg:pb-12">
      <div className="home-promo-grid grid gap-4 md:grid-cols-2 lg:gap-[18px] xl:grid-cols-4">
        {promoCards.map((card, index) => (
          <article
            key={card.title}
            className={`home-promo-card group relative flex min-h-[286px] flex-col overflow-hidden rounded-[26px] bg-gradient-to-br ${card.gradient} px-6 py-6 text-white shadow-[0_28px_70px_-42px_rgba(15,23,42,0.42)] transition-transform duration-300 hover:-translate-y-1 sm:min-h-[320px] sm:px-6 sm:py-6 lg:min-h-[332px]`}
          >
            <div className={`absolute inset-0 scale-[1.01] bg-no-repeat transition-transform duration-500 group-hover:scale-[1.05] ${card.imageClass}`} style={{ backgroundImage: `url('${card.image}')` }} />
            <div className={`absolute inset-0 ${card.overlayClass}`} />
            <div className={`absolute inset-0 ${card.glowClass}`} />
            <div className="absolute inset-x-0 bottom-0 h-[58%] bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.14)_46%,rgba(15,23,42,0.28)_100%)]" />
            {index > 0 ? (
              <button className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/8 text-white backdrop-blur-sm transition-colors hover:bg-white/16">
                <HeartIcon className="h-4 w-4" />
              </button>
            ) : null}
            <div className={`relative z-10 flex h-full flex-col ${index === 0 ? "max-w-[220px] sm:max-w-[232px]" : "max-w-[232px] sm:max-w-[242px]"}`}>
              {card.badge ? (
                <span className="inline-flex w-fit rounded-full bg-white px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ff5b4d] shadow-[0_10px_22px_-18px_rgba(255,255,255,0.9)]">
                  {card.badge}
                </span>
              ) : null}
              <h3 className={`whitespace-pre-line font-bold leading-[1.1] tracking-[-0.035em] ${index === 0 ? "mt-7 text-[19px] sm:text-[24px]" : "mt-7 text-[19px] sm:text-[24px]"}`}>
                {card.title}
              </h3>
              <div className="mt-auto pt-8">
                <p className="text-[13px] font-medium leading-none text-white/88">{card.eyebrow}</p>
                <p className="mt-2 text-[17px] font-bold leading-none tracking-[-0.03em] sm:text-[19px]">{card.price}</p>
              </div>
              <button className="mt-5 w-fit rounded-[14px] bg-white px-5 py-3 text-[13px] font-semibold text-slate-950 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.45)] transition-transform duration-200 hover:scale-[1.02]">
                {card.cta}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
