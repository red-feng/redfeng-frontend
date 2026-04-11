import AdminLoginClient from "./AdminLoginClient"
import { getCurrentLocale } from "@/lib/locale"

export default async function AdminLoginPage() {
  const locale = await getCurrentLocale()
  return <AdminLoginClient initialLocale={locale} />
}
