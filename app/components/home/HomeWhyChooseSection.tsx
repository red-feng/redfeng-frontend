import { whyChoose } from "@/app/components/home/homeContent"

export default function HomeWhyChooseSection() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 pb-6 sm:px-6 lg:px-8">
      <h2 className="text-[22px] font-black tracking-[-0.04em] text-slate-900 lg:text-[28px]">Mengapa memilih RedFeng?</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 xl:grid-cols-4">
        {whyChoose.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.title} className="flex flex-col gap-3 rounded-[18px] bg-white/70 p-2 sm:flex-row sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#ffe2d6] bg-[#fff8f4] text-[#ff8b5b] lg:h-14 lg:w-14">
                <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold lg:text-[15px]">{item.title}</h3>
                <p className="mt-2 text-[12px] leading-6 text-slate-500 lg:text-[13px]">{item.body}</p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
