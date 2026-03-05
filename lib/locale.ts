import { cookies } from "next/headers"
import { defaultLocale, localeCookieName, normalizeLocale, type Locale } from "./i18n"

export async function getCurrentLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const value = cookieStore.get(localeCookieName)?.value
  return normalizeLocale(value || defaultLocale)
}
