import Link from "next/link"
import { ArrowRightIcon, ArticleIcon, inspirationArticles } from "@/app/components/home/homeContent"

export default function HomeInspirationSection() {
  return (
    <section className="home-inspiration-section mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef6ff] text-[#2f80ed]">
          <ArticleIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-[24px] font-black tracking-[-0.04em] text-slate-900 lg:text-[30px]">Temukan ide perjalanan untuk petualangan berikutnya</h2>
          <p className="mt-1 text-[14px] text-slate-500">Cerita, panduan, dan inspirasi perjalanan pilihan untuk membantu rencana liburan berikutnya.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {inspirationArticles.map((article) => (
          <article
            key={article.title}
            className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_42px_-34px_rgba(15,23,42,0.28)] transition hover:-translate-y-1 hover:shadow-[0_28px_52px_-30px_rgba(15,23,42,0.32)]"
          >
            <div className="h-[168px] overflow-hidden">
              <div
                className="h-full w-full bg-cover bg-center transition duration-500 group-hover:scale-105"
                style={{ backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.04) 0%, rgba(15,23,42,0.2) 100%), url('${article.image}')` }}
              />
            </div>
            <div className="space-y-3 px-5 py-5">
              <span className="inline-flex rounded-full bg-[#fff3ef] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ef3b2d]">
                {article.category}
              </span>
              <h3 className="line-clamp-3 text-[24px] font-black leading-[1.12] tracking-[-0.04em] text-slate-900">
                {article.title}
              </h3>
              <div className="flex items-center justify-between gap-3 pt-2 text-[13px] text-slate-500">
                <span>{article.readTime}</span>
                <Link href={article.href} className="inline-flex items-center gap-2 font-semibold text-[#2f80ed]">
                  Baca
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="/packages"
          className="inline-flex items-center gap-2 rounded-full border border-[#cfe3ff] bg-[#f5f9ff] px-6 py-3 text-[15px] font-semibold text-[#2f80ed] transition hover:border-[#9dc7ff] hover:bg-[#edf5ff]"
        >
          Baca Artikel Inspirasi
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
