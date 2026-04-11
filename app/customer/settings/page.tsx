import Link from "next/link"
import MerchantLanguageSwitcher from "@/app/components/MerchantLanguageSwitcher"
import { normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"

export default async function CustomerSettingsPage() {
  const locale = normalizeLocale(await getCurrentLocale())
  const copy = {
    id: {
      eyebrow: "Pengaturan Akun",
      title: "Bahasa & Wilayah",
      body: "Atur bahasa tampilan RedFeng dan wilayah utama Anda. Pola ini dibuat ringan seperti aplikasi travel: customer cukup masuk ke Akun lalu ubah preferensi dari satu halaman yang jelas.",
      languageLabel: "Bahasa",
      currentLanguage: "Bahasa aplikasi",
      regionTitle: "Wilayah",
      regionBody: "Saat ini wilayah mengikuti pengalaman Indonesia. Nantinya negara, mata uang, dan preferensi regional bisa disambungkan ke pengaturan ini.",
      regionValue: "Indonesia",
      currencyTitle: "Mata uang",
      currencyBody: "Harga live paket tetap mengikuti konteks customer dan locale aktif. Pengaturan currency terpisah bisa ditambahkan setelah modul multi-currency customer dibuka penuh.",
      currencyValue: "IDR",
      accountBack: "Kembali ke akun",
      helperTitle: "Kenapa diletakkan di sini?",
      helperBody: "Supaya homepage mobile tetap fokus ke pencarian dan paket trending, sementara pengaturan bahasa tetap mudah ditemukan dari menu Akun seperti pola OTA/mobile commerce.",
    },
    en: {
      eyebrow: "Account Settings",
      title: "Language & Region",
      body: "Set your RedFeng interface language and primary region. This keeps the flow light like a travel app: customers open Account and manage preferences from one clear screen.",
      languageLabel: "Language",
      currentLanguage: "App language",
      regionTitle: "Region",
      regionBody: "The current region experience follows Indonesia. Country, currency, and regional preferences can be extended here later.",
      regionValue: "Indonesia",
      currencyTitle: "Currency",
      currencyBody: "Live package prices still follow customer context and the active locale. A dedicated customer multi-currency setting can be added later.",
      currencyValue: "IDR",
      accountBack: "Back to account",
      helperTitle: "Why is it here?",
      helperBody: "This keeps the mobile homepage focused on discovery and trending packages while language settings remain easy to find from the Account area, just like OTA apps.",
    },
    zh: {
      eyebrow: "账户设置",
      title: "语言与地区",
      body: "设置 RedFeng 的界面语言和主要地区。这样的流程更像旅行 App：用户进入账户后，就能在一个清晰的页面中管理偏好设置。",
      languageLabel: "语言",
      currentLanguage: "应用语言",
      regionTitle: "地区",
      regionBody: "当前地区体验以印度尼西亚为主，后续国家、货币和区域偏好也可以继续接入这里。",
      regionValue: "印度尼西亚",
      currencyTitle: "货币",
      currencyBody: "套餐实时价格仍会根据用户上下文和当前语言环境显示。后续可再加入独立的客户多货币设置。",
      currencyValue: "IDR",
      accountBack: "返回账户",
      helperTitle: "为什么放在这里？",
      helperBody: "这样首页可以继续专注在搜索和热门套餐，而语言设置依然能像 OTA 应用一样从账户区域轻松找到。",
    },
  }[locale]

  const languageOptions = [
    { value: "id" as const, label: "Bahasa Indonesia" },
    { value: "en" as const, label: "English" },
    { value: "zh" as const, label: "中文" },
  ]

  const currentLanguageLabel =
    locale === "en" ? "English" : locale === "zh" ? "中文" : "Bahasa Indonesia"

  return (
    <main className="px-4 py-5 sm:px-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_34%,#f97316_68%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_90px_rgba(146,64,14,0.18)] sm:px-7 sm:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-orange-50">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">{copy.title}</h1>
              <p className="mt-3 text-sm leading-7 text-orange-50/92 sm:text-base">{copy.body}</p>
            </div>
            <Link
              href="/customer"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              {copy.accountBack}
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[30px] border border-[#f0ddc7] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">{copy.currentLanguage}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{copy.languageLabel}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">{copy.helperBody}</p>

            <div className="mt-5 rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{copy.currentLanguage}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{currentLanguageLabel}</p>
                </div>
              </div>

              <div className="mt-4">
                <MerchantLanguageSwitcher locale={locale} label={copy.languageLabel} options={languageOptions} />
              </div>
            </div>
          </article>

          <div className="space-y-6">
            <article className="rounded-[30px] border border-[#f0ddc7] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">{copy.regionTitle}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{copy.regionValue}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{copy.regionBody}</p>
            </article>

            <article className="rounded-[30px] border border-[#f0ddc7] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">{copy.currencyTitle}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{copy.currencyValue}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{copy.currencyBody}</p>
            </article>

            <article className="rounded-[30px] border border-[#f0ddc7] bg-[#fffaf3] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">{copy.helperTitle}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{copy.helperBody}</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}
