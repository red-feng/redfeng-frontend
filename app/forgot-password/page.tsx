import ForgotPasswordClient from "./ForgotPasswordClient"
import { getCurrentLocale } from "@/lib/locale"

export default async function ForgotPasswordPage() {
  const locale = await getCurrentLocale()
  return <ForgotPasswordClient initialLocale={locale} />
}
