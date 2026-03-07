import CheckoutClient from "./CheckoutClient"
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
      .select("id, slug, title, price_adult, price_child, currency, duration, minimal_peserta, cover_image")
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
        .select("id, slug, title, price_adult, price_child, currency, duration, minimal_peserta, cover_image")
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

  return <CheckoutClient data={pkg} locale={locale as Locale} />
}
