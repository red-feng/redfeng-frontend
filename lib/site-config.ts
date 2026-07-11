function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "")
}

function normalizePathname(pathname: string) {
  return pathname.startsWith("/") ? pathname : `/${pathname}`
}

function sanitizeHostname(value: string) {
  return String(value || "").trim().toLowerCase().replace(/:\d+$/, "")
}

function resolveExplicitCookieDomain() {
  const explicit = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || process.env.COOKIE_DOMAIN || ""
  const normalized = sanitizeHostname(explicit).replace(/^\.+/, "")
  if (!normalized) return ""
  return `.${normalized}`
}

function inferCookieDomain(hostname: string) {
  const normalized = sanitizeHostname(hostname)
  if (!normalized || normalized === "localhost" || normalized.includes("://")) return undefined
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) return undefined

  const segments = normalized.split(".").filter(Boolean)
  if (segments.length < 2) return undefined
  return `.${segments.slice(-2).join(".")}`
}

const LEGACY_APP_URL = "https://redfeng.co"
const LEGACY_SITE_URL = "https://redfeng.co"

export function getAppBaseUrl() {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      LEGACY_APP_URL,
  )
}

export function getSiteBaseUrl() {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || LEGACY_SITE_URL)
}

export function getAppHost() {
  return new URL(getAppBaseUrl()).hostname
}

export function getSiteHost() {
  return new URL(getSiteBaseUrl()).hostname
}

export function buildAppUrl(pathname = "/") {
  return new URL(normalizePathname(pathname), `${getAppBaseUrl()}/`).toString()
}

export function buildSiteUrl(pathname = "/") {
  return new URL(normalizePathname(pathname), `${getSiteBaseUrl()}/`).toString()
}

export function resolveCookieDomainForHostname(hostname: string) {
  return resolveExplicitCookieDomain() || inferCookieDomain(hostname)
}
