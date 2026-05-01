import { serviceCards } from "@/app/components/home/homeContent"

export default function HomeServicesSection() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 pb-5 pt-2 sm:px-6 lg:px-8">
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-2 lg:gap-4 lg:grid-cols-7">
        {serviceCards.map((card) => {
          const Icon = card.icon
          return (
            <article
              key={card.label}
              className={`group rounded-[20px] border border-[#edf1f7] bg-white px-3 py-4 text-center shadow-[0_8px_18px_-24px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-1 hover:border-[#d8e3f0] hover:shadow-[0_18px_36px_-24px_rgba(15,23,42,0.12)] lg:rounded-[24px] lg:border-[#e8eef6] lg:py-6 lg:shadow-[0_12px_28px_-26px_rgba(15,23,42,0.08)] ${card.label === "Paket Wisata" ? "col-span-2 mx-auto w-full max-w-[168px] sm:col-span-1 sm:mx-0 sm:max-w-none" : ""}`}
            >
              <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-[16px] bg-white transition-transform duration-200 group-hover:scale-105 sm:h-14 sm:w-14 lg:h-14 lg:w-14 lg:rounded-[18px] ${card.tone}`}>
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <h3 className="mt-3 text-[12px] font-bold sm:mt-4 sm:text-[16px]">{card.label}</h3>
              <p className="mt-1 hidden text-[12px] leading-5 text-slate-400 lg:block">{card.desc}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
