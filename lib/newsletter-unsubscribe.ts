import { createHmac } from "crypto"
import { getOptionalEnv } from "@/lib/env"
import { getAppBaseUrl } from "@/lib/site-config"

const unsubscribeCopy = {
  id: {
    cta: "Berhenti berlangganan",
  },
  en: {
    cta: "Unsubscribe",
  },
  zh: {
    cta: "取消订阅",
  },
} as const

export function normalizeNewsletterLocale(locale: string | null | undefined) {
  const normalized = String(locale || "id").trim().toLowerCase()
  if (normalized === "en" || normalized === "zh") return normalized
  return "id"
}

export function normalizeNewsletterEmail(email: string | null | undefined) {
  return String(email || "").trim().toLowerCase()
}

export function isValidNewsletterEmail(email: string | null | undefined) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeNewsletterEmail(email))
}

function getNewsletterBaseUrl() {
  const explicit = getAppBaseUrl()
  if (explicit) return explicit

  const vercelUrl = getOptionalEnv("VERCEL_URL")
  if (vercelUrl) {
    return `https://${vercelUrl}`.replace(/\/+$/, "")
  }

  return "http://localhost:3000"
}

function getNewsletterUnsubscribeSecret() {
  return getOptionalEnv("NEWSLETTER_UNSUBSCRIBE_SECRET") || getOptionalEnv("RESEND_API_KEY")
}

export function buildNewsletterUnsubscribeToken(email: string) {
  const normalizedEmail = normalizeNewsletterEmail(email)
  const secret = getNewsletterUnsubscribeSecret()

  if (!normalizedEmail || !secret) {
    throw new Error("NEWSLETTER_UNSUBSCRIBE_SECRET atau RESEND_API_KEY belum diatur.")
  }

  return createHmac("sha256", secret).update(normalizedEmail).digest("hex")
}

export function verifyNewsletterUnsubscribeToken(email: string, token: string | null | undefined) {
  const normalizedEmail = normalizeNewsletterEmail(email)
  const normalizedToken = String(token || "").trim()
  if (!normalizedEmail || !normalizedToken) return false

  try {
    return buildNewsletterUnsubscribeToken(normalizedEmail) === normalizedToken
  } catch {
    return false
  }
}

export function buildNewsletterUnsubscribeUrl(email: string, locale?: string | null) {
  const normalizedEmail = normalizeNewsletterEmail(email)
  const normalizedLocale = normalizeNewsletterLocale(locale)
  const url = new URL(`${getNewsletterBaseUrl()}/newsletter/unsubscribe`)
  url.searchParams.set("email", normalizedEmail)
  url.searchParams.set("token", buildNewsletterUnsubscribeToken(normalizedEmail))
  url.searchParams.set("locale", normalizedLocale)
  return url.toString()
}

export function getNewsletterUnsubscribeLabel(locale?: string | null) {
  return unsubscribeCopy[normalizeNewsletterLocale(locale)].cta
}
