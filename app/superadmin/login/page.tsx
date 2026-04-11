import SuperadminLoginClient from "./SuperadminLoginClient"
import { getCurrentLocale } from "@/lib/locale"

export default async function SuperadminLoginPage() {
  const locale = await getCurrentLocale()
  return <SuperadminLoginClient initialLocale={locale} />
}
