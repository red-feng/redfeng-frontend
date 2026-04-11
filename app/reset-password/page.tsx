import ResetPasswordClient from "./ResetPasswordClient"
import { getCurrentLocale } from "@/lib/locale"

export default async function ResetPasswordPage() {
  const locale = await getCurrentLocale()
  return <ResetPasswordClient initialLocale={locale} />
}
