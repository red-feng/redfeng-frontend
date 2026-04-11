import CustomerAuthPanel from "@/app/components/CustomerAuthPanel"
import { getCurrentLocale } from "@/lib/locale"

export default async function LoginPage() {
  const locale = await getCurrentLocale()
  return <CustomerAuthPanel mode="login" initialLocale={locale} />
}
