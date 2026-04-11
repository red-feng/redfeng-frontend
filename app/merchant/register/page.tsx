import MerchantRegisterClient from "./MerchantRegisterClient"
import { getCurrentLocale } from "@/lib/locale"

export default async function MerchantRegisterPage() {
  const locale = await getCurrentLocale()
  return <MerchantRegisterClient initialLocale={locale} />
}
