import { createHash, randomBytes } from "crypto"
import { getRequiredEnv } from "@/lib/env"

const DEFAULT_WORDPRESS_CALLBACK_PATH = "/rf-sso-login"
const DEFAULT_WORDPRESS_AFTER_LOGIN_PATH = "/my-account"

export function getWordPressSiteUrl() {
  return getRequiredEnv("WORDPRESS_SITE_URL").replace(/\/+$/, "")
}

export function getWordPressCallbackPath() {
  return process.env.WORDPRESS_SSO_LOGIN_PATH || DEFAULT_WORDPRESS_CALLBACK_PATH
}

export function getWordPressSharedSecret() {
  return getRequiredEnv("WORDPRESS_SSO_SHARED_SECRET")
}

export function sanitizeWordPressRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) return DEFAULT_WORDPRESS_AFTER_LOGIN_PATH
  return value
}

export function createRawSsoToken() {
  return randomBytes(32).toString("hex")
}

export function hashSsoToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export function buildWordPressSsoRedirectUrl(token: string, redirectPath: string) {
  const baseUrl = getWordPressSiteUrl()
  const callbackPath = getWordPressCallbackPath()
  const callbackUrl = new URL(`${baseUrl}${callbackPath}`)
  callbackUrl.searchParams.set("token", token)
  callbackUrl.searchParams.set("redirect_to", redirectPath)
  return callbackUrl.toString()
}
