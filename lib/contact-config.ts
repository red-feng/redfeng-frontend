import { getOptionalEnv } from "@/lib/env"

const LEGACY_PUBLIC_CONTACT_EMAIL = "hello@redfeng.co"
const LEGACY_ADMIN_SUPPORT_EMAIL = "admin@redfeng.co"

export function getPublicContactEmail() {
  return (
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
    process.env.NEXT_PUBLIC_PUBLIC_CONTACT_EMAIL ||
    getOptionalEnv("CONTACT_EMAIL") ||
    getOptionalEnv("PUBLIC_CONTACT_EMAIL") ||
    LEGACY_PUBLIC_CONTACT_EMAIL
  )
}

export function getPrivacyContactEmail() {
  return (
    process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL ||
    getOptionalEnv("PRIVACY_CONTACT_EMAIL") ||
    getPublicContactEmail()
  )
}

export function getAdminSupportEmail() {
  return (
    process.env.NEXT_PUBLIC_ADMIN_SUPPORT_EMAIL ||
    getOptionalEnv("ADMIN_SUPPORT_EMAIL") ||
    LEGACY_ADMIN_SUPPORT_EMAIL
  )
}

export function getCustomerResendFromEmail() {
  return getOptionalEnv("RESEND_FROM_EMAIL", `Red Feng <${getPublicContactEmail()}>`)
}

export function getAdminResendFromEmail() {
  return getOptionalEnv("RESEND_ADMIN_FROM_EMAIL", `RedFeng Admin <${getAdminSupportEmail()}>`)
}

export function buildMailtoLink(email: string, options?: { subject?: string; body?: string }) {
  const params = new URLSearchParams()
  if (options?.subject) params.set("subject", options.subject)
  if (options?.body) params.set("body", options.body)
  const query = params.toString()
  return `mailto:${email}${query ? `?${query}` : ""}`
}
