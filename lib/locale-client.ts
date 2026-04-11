import { localeCookieName, normalizeLocale, type Locale } from "./i18n"

export function readLocaleFromCookie(): Locale {
  if (typeof document === "undefined") return "id"

  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${localeCookieName}=`))

  return normalizeLocale(cookie?.split("=")[1])
}
