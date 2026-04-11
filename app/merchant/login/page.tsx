import MerchantLoginClient from "./MerchantLoginClient"
import { getCurrentLocale } from "@/lib/locale"

export default async function MerchantLoginPage() {
  const locale = await getCurrentLocale()
  return <MerchantLoginClient initialLocale={locale} />
}
