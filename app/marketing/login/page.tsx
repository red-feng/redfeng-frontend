import { getCurrentLocale } from "@/lib/locale"
import MarketingLoginClient from "./MarketingLoginClient"

export default async function MarketingLoginPage() {
  const locale = await getCurrentLocale()
  return <MarketingLoginClient initialLocale={locale} />
}
