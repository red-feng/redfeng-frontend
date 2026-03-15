import CheckoutClient from "./CheckoutClient"
import { defaultFinanceSettings } from "@/lib/finance/settings"
import { getCurrentLocale } from "@/lib/locale"
import { dictionaries, type Locale } from "@/lib/i18n"
import { createAdminClient } from "@/lib/supabase/admin"

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
  title: string | null
  price_adult: number | null
  price_child: number | null
  currency: string | null
  duration: number | null
  minimal_peserta: number | null
  travel_style: string | null
  cover_image: string | null
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const locale = await getCurrentLocale()
  const t = dictionaries[locale].checkout
  const supabase = createAdminClient()

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
        .select("id, slug, title, price_adult, price_child, currency, duration, minimal_peserta, travel_style, cover_image")
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
        .select("id, slug, title, price_adult, price_child, currency, duration, minimal_peserta, travel_style, cover_image")
        .ilike("slug", `%${suffix}`)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle()

      pkg = (data as PackageCheckoutRow | null) || null
    }
  }

  if (!pkg) {
    return <div className="p-10">{t.packageNotFound}</div>
  }

  const settingsResult = await ((supabase
    .from("finance_settings")
    .select(
      "redfeng_commission_percent, customer_admin_fee_percent, customer_tax_percent, merchant_transfer_fee",
    )
    .eq("id", "default")
    .maybeSingle()) as unknown as Promise<{
    data: {
      customer_admin_fee_percent?: number | string | null
      customer_tax_percent?: number | string | null
    } | null
    error: { message?: string } | null
  }>)

  const financeSettings = {
    customerAdminFeePercent: Number(
      settingsResult.data?.customer_admin_fee_percent ?? defaultFinanceSettings.customerAdminFeePercent,
    ),
    customerTaxPercent: Number(
      settingsResult.data?.customer_tax_percent ?? defaultFinanceSettings.customerTaxPercent,
    ),
  }

  return <CheckoutClient data={pkg} locale={locale as Locale} financeSettings={financeSettings} />
}
