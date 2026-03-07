import CheckoutClient from "./CheckoutClient"
import { getCurrentLocale } from "@/lib/locale"
import { dictionaries, type Locale } from "@/lib/i18n"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

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
  const { slug } = await params
  const locale = await getCurrentLocale()
  const t = dictionaries[locale].checkout
  const supabase = createAdminClient()

  const { data: pkg } = await supabase
    .from("packages")
    .select("id, slug, title, price_adult, price_child, currency, duration, minimal_peserta, cover_image")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle()

  if (!pkg) {
    return <div className="p-10">{t.packageNotFound}</div>
  }

  return <CheckoutClient data={pkg as PackageCheckoutRow} locale={locale as Locale} />
}
