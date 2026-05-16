import CheckoutClient from "./CheckoutClient"
import { getFinanceSettings } from "@/lib/finance/settings"
import { convertCurrencyAmount } from "@/lib/currency-rates"
import { getLiveLocalizedPackagePricing } from "@/lib/currency-rates"
import { getOwnedMerchantsForUser } from "@/lib/commerce-chat"
import { getCurrentLocale } from "@/lib/locale"
import { dictionaries, type Locale } from "@/lib/i18n"
import { resolvePackageTranslation } from "@/lib/package-pricing"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeSlug(value: string): string {
  return value.replace(/^["'â€œâ€]+|["'â€œâ€]+$/g, "")
}

type PackageCheckoutRow = {
  id: string
  slug: string
  merchant_id: string | null
  title: string | null
  departure_date: string | null
  price_adult: number | null
  price_child: number | null
  currency: string | null
  duration: number | null
  minimal_peserta: number | null
  travel_style: string | null
  cover_image: string | null
  default_language?: string | null
  published_languages?: string[] | null
  package_translations?: Array<{
    language_code?: string | null
    title: string | null
    currency?: string | null
    price_adult?: number | null
    price_child?: number | null
  }> | null
}

const checkoutPackageSelect =
  "id, slug, merchant_id, title, departure_date, price_adult, price_child, currency, duration, minimal_peserta, travel_style, cover_image, default_language, published_languages, package_translations(language_code, title, currency, price_adult, price_child)"

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const locale = await getCurrentLocale()
  const t = dictionaries[locale].checkout
  const supabase = createAdminClient()
  const authSupabase = await createClient("customer")
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  const slugCandidates = [
    rawSlug,
    safeDecode(rawSlug),
    normalizeSlug(rawSlug),
    normalizeSlug(safeDecode(rawSlug)),
  ].filter((value, index, arr) => value && arr.indexOf(value) === index)

  let pkg: PackageCheckoutRow | null = null

  for (const candidate of slugCandidates) {
      const { data } = await supabase
        .from("packages")
        .select(checkoutPackageSelect)
        .eq("slug", candidate)
      .eq("status", "approved")
      .maybeSingle()

    if (data) {
      pkg = data as PackageCheckoutRow
      break
    }
  }

  if (!pkg) {
    const suffix = normalizeSlug(safeDecode(rawSlug)).match(/([a-z0-9]{6,})$/i)?.[1]

    if (suffix) {
      const { data } = await supabase
        .from("packages")
        .select(checkoutPackageSelect)
        .ilike("slug", `%${suffix}`)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle()

      pkg = (data as PackageCheckoutRow | null) || null
    }
  }

  if (!pkg) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-10 sm:px-6 md:px-10">
        <div className="mx-auto max-w-3xl">
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:rounded-[32px] sm:p-8">
            <p className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-600">
              {locale === "id" ? "Checkout" : locale === "en" ? "Checkout" : "结账"}
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {t.packageNotFound}
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
              {locale === "id"
                ? "Paket yang ingin Anda booking tidak tersedia lagi atau tautannya sudah berubah."
                : locale === "en"
                  ? "The package you want to book is no longer available or the link has changed."
                  : "您想预订的套餐已不可用，或链接已发生变化。"}
            </p>
          </section>
        </div>
      </main>
    )
  }

  if (user?.id) {
    const ownedMerchants = await getOwnedMerchantsForUser(supabase, user.id)
    const isOwnMerchantPackage = ownedMerchants.some((merchant) => merchant.id === pkg?.merchant_id)
    if (isOwnMerchantPackage) {
      redirect(`/packages/${encodeURIComponent(pkg.slug)}`)
    }
  }

  const localizedTranslation = resolvePackageTranslation(
    pkg.package_translations,
    locale as Locale,
    pkg.default_language,
    pkg.published_languages,
  )
  const [localizedPricing, paymentAdultPrice, paymentChildPrice, settings] = await Promise.all([
    getLiveLocalizedPackagePricing({
      locale: locale as Locale,
      defaultLanguage: pkg.default_language,
      publishedLanguages: pkg.published_languages,
      baseCurrency: pkg.currency,
      baseAdultPrice: pkg.price_adult,
      baseChildPrice: pkg.price_child,
    }),
    convertCurrencyAmount({
      amount: Number(pkg.price_adult || 0),
      fromCurrency: pkg.currency || "IDR",
      toCurrency: "IDR",
    }),
    convertCurrencyAmount({
      amount: Number(pkg.price_child || 0),
      fromCurrency: pkg.currency || "IDR",
      toCurrency: "IDR",
    }),
    getFinanceSettings(
      supabase as unknown as Parameters<typeof getFinanceSettings>[0],
    ),
  ])
  const financeSettings = {
    customerTaxPercent: settings.customerTaxPercent,
    customerAdminFeeRules: settings.customerAdminFeeRules,
  }

  return (
    <CheckoutClient
      data={{
        ...pkg,
        title: localizedTranslation?.title || pkg.title,
        price_adult: localizedPricing.priceAdult,
        price_child: localizedPricing.priceChild,
        currency: localizedPricing.currency,
      }}
      locale={locale as Locale}
      financeSettings={financeSettings}
      paymentPricing={{
        currency: "IDR",
        adultPrice: paymentAdultPrice.amount,
        childPrice: paymentChildPrice.amount,
        exchangeDate: paymentAdultPrice.date || paymentChildPrice.date,
      }}
    />
  )
}
