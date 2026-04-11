import CustomerAuthPanel from "@/app/components/CustomerAuthPanel"
import { getCurrentLocale } from "@/lib/locale"

export default async function RegisterPage() {
  const locale = await getCurrentLocale()
  return <CustomerAuthPanel mode="register" initialLocale={locale} />
}
