import Link from "next/link"
import { ArrowRightIcon } from "@/app/components/home/shared/homeContent"
import { inspirationArticleCatalog } from "@/app/components/home/shared/homeDetailCatalog"

export default function HomeInspirationSection() {
  return (
    <section className="home-inspiration-section mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="home-inspiration-intro mb-5 flex items-center gap-3">
        <div className="home-inspiration-copy">
          <h2 className="home-inspiration-title text-[14px] font-semibold leading-[1.32] tracking-normal text-slate-900 lg:text-[15px]">Temukan ide perjalanan untuk petualangan berikutnya</h2>
        </div>
      </div>

      <div className="home-inspiration-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {inspirationArticleCatalog.map((article) => (
          <article
            key={article.title}
            className="home-inspiration-card group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_42px_-34px_rgba(15,23,42,0.28)] transition hover:-translate-y-1 hover:shadow-[0_28px_52px_-30px_rgba(15,23,42,0.32)]"
          >
            <div className="home-inspiration-media h-[168px] overflow-hidden">
              <div
                className="h-full w-full bg-cover bg-center transition duration-500 group-hover:scale-105"
                style={{ backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.04) 0%, rgba(15,23,42,0.2) 100%), url('${article.image}')` }}
              />
            </div>
            <div className="home-inspiration-body space-y-3 px-5 py-5">
              <span className="home-inspiration-category inline-flex rounded-full bg-[#fff3ef] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ef3b2d]">
                {article.category}
              </span>
              <h3 className="home-inspiration-card-title line-clamp-3 text-[14px] font-semibold leading-[1.32] tracking-normal text-slate-900 lg:text-[15px]">
                {article.title}
              </h3>
              <div className="home-inspiration-card-footer flex items-center justify-between gap-3 pt-2 text-[12px] text-slate-500">
                <span className="home-inspiration-readtime">{article.readTime}</span>
                <Link href={article.detailHref} className="home-inspiration-link inline-flex items-center gap-2 font-semibold text-slate-900">
                  Baca
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="home-inspiration-cta mt-8 flex justify-center">
        <Link
          href="/packages"
          className="inline-flex items-center gap-2 rounded-full border border-[#d8dee8] bg-[#f8fafc] px-6 py-3 text-[13px] font-semibold text-slate-900 transition hover:border-[#c9d2df] hover:bg-[#f1f5f9]"
        >
          Baca Artikel Inspirasi
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
