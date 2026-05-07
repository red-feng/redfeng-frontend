import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import type { Locale } from "@/lib/i18n"
import type { ServicePageConfig } from "@/app/components/services/serviceCatalog"

type ServiceLandingPageProps = {
  locale: Locale
  service: ServicePageConfig
}

export default function ServiceLandingPage({ locale, service }: ServiceLandingPageProps) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} />

      <main className="px-4 pb-10 pt-5 sm:px-6 md:px-8 md:pb-14 md:pt-7">
        <div className="mx-auto max-w-[1360px] space-y-6">
          <section className={`overflow-hidden rounded-[32px] border border-white/50 bg-gradient-to-br ${service.accent} p-6 text-white shadow-[0_28px_90px_-42px_rgba(15,23,42,0.42)] sm:p-7 lg:p-8`}>
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/90">
                  {service.eyebrow}
                </p>
                <h1 className="mt-4 max-w-3xl text-[28px] font-semibold tracking-[-0.03em] sm:text-[36px] lg:text-[44px]">
                  {service.title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/90 sm:text-base">
                  {service.body}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={service.primaryCta.href}
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-50"
                  >
                    {service.primaryCta.label}
                  </Link>
                  <Link
                    href={service.secondaryCta.href}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/35 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    {service.secondaryCta.label}
                  </Link>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[28px] border border-white/20 bg-white/10 p-5 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/15 text-white">
                      {service.icon}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75">Status layanan</p>
                      <p className="mt-2 text-lg font-semibold text-white">{service.label}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-white/88">{service.status}</p>
                </div>

                <div className="rounded-[28px] border border-white/20 bg-white/10 p-5 backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75">Fokus tahap ini</p>
                  <div className="mt-4 grid gap-3">
                    {service.highlights.map((item) => (
                      <div key={item} className="rounded-[18px] border border-white/16 bg-white/10 px-4 py-3 text-sm leading-6 text-white/92">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <article className={`rounded-[28px] border p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] ${service.cardTone}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em]">Tujuan sekarang</p>
              <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.03em]">Menu layanan tidak lagi mentok</h2>
              <p className="mt-3 text-sm leading-7 opacity-85">
                Semua entry point untuk {service.shortLabel.toLowerCase()} sekarang diarahkan ke route internal yang sama di aplikasi dan website.
              </p>
            </article>

            <article className="rounded-[28px] border border-[#f0ddc7] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">Langkah berikutnya</p>
              <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.03em] text-slate-950">Siap untuk data live</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Template ini sudah siap dikembangkan ke hasil pencarian live, daftar operator, inventory, maupun detail produk sesuai kebutuhan backend berikutnya.
              </p>
            </article>

            <article className="rounded-[28px] border border-[#f0ddc7] bg-[linear-gradient(180deg,#fff7ef_0%,#ffffff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">Tetap satu sistem</p>
              <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.03em] text-slate-950">App dan website membaca tujuan yang sama</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Prinsip sinkron tetap dijaga: satu route, satu konteks layanan, hanya desain dan pola interaksi yang menyesuaikan device.
              </p>
            </article>
          </section>
        </div>
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}
