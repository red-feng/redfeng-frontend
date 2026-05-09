import { whyChoose } from "@/app/components/home/shared/homeContent"
import type { Locale } from "@/lib/i18n"

export default function HomeWhyChooseSection({ locale }: { locale: Locale }) {
  const copy = {
    id: {
      title: "Mengapa memilih RedFeng?",
      items: whyChoose,
    },
    en: {
      title: "Why choose RedFeng?",
      items: [
        { ...whyChoose[0], title: "Best Prices", body: "We offer competitive prices every day" },
        { ...whyChoose[1], title: "More Choices", body: "Thousands of products and favorite destinations" },
        { ...whyChoose[2], title: "Safe & Trusted", body: "Secure transactions with international-grade systems" },
        { ...whyChoose[3], title: "24/7 Support", body: "Our team is ready to help whenever you need" },
      ],
    },
    zh: {
      title: "为什么选择 RedFeng？",
      items: [
        { ...whyChoose[0], title: "超值价格", body: "我们每天提供有竞争力的价格" },
        { ...whyChoose[1], title: "更多选择", body: "海量产品与热门目的地任你挑选" },
        { ...whyChoose[2], title: "安全可靠", body: "采用国际标准系统保障交易安全" },
        { ...whyChoose[3], title: "24/7 支持", body: "无论何时需要，我们的团队都能协助您" },
      ],
    },
  }[locale]

  return (
    <section className="home-why-choose-section mx-auto max-w-[1240px] px-4 pb-8 sm:px-6 lg:px-8 lg:pb-10">
      <h2 className="text-[14px] font-semibold leading-[1.32] tracking-normal text-slate-900 lg:text-[15px]">{copy.title}</h2>
      <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-7 xl:grid-cols-4">
        {copy.items.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.title} className="flex flex-col gap-3 rounded-[18px] bg-white/70 p-2 sm:flex-row sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#ffe2d6] bg-[#fff8f4] text-[#ff8b5b] lg:h-14 lg:w-14">
                <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold lg:text-[15px]">{item.title}</h3>
                <p className="mt-2 text-[12px] leading-7 text-slate-500 lg:text-[13px]">{item.body}</p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
