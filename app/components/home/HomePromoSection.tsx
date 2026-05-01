import { HeartIcon, promoCards } from "@/app/components/home/homeContent"

export default function HomePromoSection() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 py-4 sm:px-6 lg:px-8">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr] lg:gap-4">
        {promoCards.map((card, index) => (
          <article
            key={card.title}
            className={`relative overflow-hidden rounded-[20px] px-6 py-5 text-white shadow-[0_24px_50px_-34px_rgba(15,23,42,0.3)] ${
              index === 0
                ? `min-h-[188px] bg-gradient-to-br ${card.gradient} lg:col-span-1 lg:min-h-[218px] lg:px-6 lg:py-6`
                : `min-h-[188px] bg-gradient-to-br ${card.gradient} lg:min-h-[218px] lg:px-6 lg:py-6`
            }`}
          >
            <div className={`absolute inset-0 ${card.imageClass}`} style={{ backgroundImage: `url('${card.image}')` }} />
            <div className={`absolute inset-0 ${card.overlayClass}`} />
            {index > 0 ? (
              <button className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur">
                <HeartIcon className="h-4 w-4" />
              </button>
            ) : null}
            <div className={`relative z-10 ${index === 0 ? "max-w-[215px] lg:max-w-[255px]" : "max-w-[210px] lg:max-w-[235px]"}`}>
              {card.badge ? (
                <span className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.05em] text-[#ff5b4d]">
                  {card.badge}
                </span>
              ) : null}
              <h3 className={`whitespace-pre-line font-bold leading-[1.14] ${index === 0 ? "mt-3 text-[22px] tracking-[-0.05em] lg:mt-6 lg:text-[32px] lg:tracking-[-0.06em]" : "text-[18px] tracking-[-0.04em] lg:text-[26px] lg:tracking-[-0.05em]"}`}>
                {card.title}
              </h3>
              <p className={`text-white/90 ${index === 0 ? "mt-3 lg:mt-5" : "mt-3 lg:mt-4"} text-[13px]`}>{card.eyebrow}</p>
              <p className={`mt-1 font-black tracking-[-0.03em] ${index === 0 ? "text-[18px] lg:text-[22px]" : "text-[16px] sm:text-[18px] lg:text-[20px]"}`}>{card.price}</p>
              <button className="mt-4 rounded-[11px] bg-white px-4 py-2.5 text-[12px] font-bold text-slate-900 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.45)] lg:mt-5">
                {card.cta}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
