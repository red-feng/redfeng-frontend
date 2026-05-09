import Link from "next/link"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import { getCurrentLocale } from "@/lib/locale"

export const dynamic = "force-static"

export default async function OfflinePage() {
  const locale = await getCurrentLocale()
  const copy = {
    id: {
      eyebrow: "Mode Offline",
      title: "Koneksi sedang tidak tersedia.",
      body: "Halaman ini tetap bisa dibuka supaya pengguna aplikasi tidak merasa buntu. Saat koneksi kembali, mereka bisa lanjut jelajahi paket atau masuk lagi ke beranda.",
      primary: "Coba lagi ke beranda",
      secondary: "Buka katalog paket",
    },
    en: {
      eyebrow: "Offline Mode",
      title: "Your connection is currently unavailable.",
      body: "This screen stays available so the app still feels responsive. Once the connection returns, users can continue browsing packages or go back home.",
      primary: "Try home again",
      secondary: "Open package catalog",
    },
    zh: {
      eyebrow: "离线模式",
      title: "当前网络不可用。",
      body: "这个页面会继续可用，避免应用看起来像卡住了一样。网络恢复后，用户可以继续浏览套餐或返回首页。",
      primary: "返回首页重试",
      secondary: "打开套餐目录",
    },
  }[locale]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_36%,#f4f7fb_100%)] pb-28 md:pb-10">
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10 sm:px-6">
        <section className="w-full overflow-hidden rounded-[32px] border border-orange-100 bg-[linear-gradient(135deg,#ffffff_0%,#fff8ef_55%,#fff1e1_100%)] p-6 shadow-[0_32px_80px_-42px_rgba(249,115,22,0.45)] sm:p-8">
          <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-orange-600">
            {copy.eyebrow}
          </div>
          <div className="mt-5 flex h-20 w-20 items-center justify-center rounded-[24px] bg-[radial-gradient(circle_at_30%_30%,#fdba74_0%,#fb923c_48%,#ea580c_100%)] text-white shadow-[0_18px_42px_-22px_rgba(249,115,22,0.75)]">
            <svg viewBox="0 0 24 24" className="h-10 w-10 fill-none stroke-current stroke-[1.8]">
              <path d="M3 9.5A14 14 0 0 1 21 9.5" />
              <path d="M6 13a9.5 9.5 0 0 1 12 0" />
              <path d="M9.5 16.5a5 5 0 0 1 5 0" />
              <path d="M12 20h.01" />
              <path d="M4 4l16 16" />
            </svg>
          </div>
          <h1 className="mt-6 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-slate-950">
            {copy.title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            {copy.body}
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              {copy.primary}
            </Link>
            <Link
              href="/packages/catalog"
              className="inline-flex items-center justify-center rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
            >
              {copy.secondary}
            </Link>
          </div>
        </section>
      </main>
      <PublicMobileNav locale={locale} />
    </div>
  )
}
