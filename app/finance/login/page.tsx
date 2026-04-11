import FinanceLoginClient from "./FinanceLoginClient"
import { getCurrentLocale } from "@/lib/locale"

export default async function FinanceLoginPage() {
  const locale = await getCurrentLocale()
  return <FinanceLoginClient initialLocale={locale} />
}
