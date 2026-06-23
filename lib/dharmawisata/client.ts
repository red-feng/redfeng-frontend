import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import https from "node:https"

import { getOptionalEnv, getRequiredEnv } from "@/lib/env"

export type DharmawisataCredentials = {
  userId: string
  password: string
}

export type DharmawisataAuthResponse = {
  accessToken: string | null
  respTime?: string
  userID?: string
  status?: string
  respMessage?: string
}

export type DharmawisataClientConfig = {
  baseUrl: string
  credentials: DharmawisataCredentials
}

export type DharmawisataRequestOptions = {
  path?: string
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  headers?: HeadersInit
  body?: BodyInit | null
  cache?: RequestCache
  timeoutMs?: number
  next?: {
    revalidate?: number | false
    tags?: string[]
  }
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "")
}

function joinPath(baseUrl: string, path = "") {
  const normalizedPath = path.replace(/^\/+/, "")
  return normalizedPath ? `${baseUrl}/${normalizedPath}` : baseUrl
}

function normalizeHeaders(headers?: HeadersInit) {
  const normalized = new Headers(headers)
  const result: Record<string, string> = {}
  normalized.forEach((value, key) => {
    result[key] = value
  })
  return result
}

function getDharmawisataMtlsOptions() {
  const certPath = getOptionalEnv("DHARMAWISATA_H2H_CLIENT_CERT_PATH").trim()
  const keyPath = getOptionalEnv("DHARMAWISATA_H2H_CLIENT_KEY_PATH").trim()
  const pfxPath = getOptionalEnv("DHARMAWISATA_H2H_CLIENT_PFX_PATH").trim()
  const caPath = getOptionalEnv("DHARMAWISATA_H2H_CA_CERT_PATH").trim()
  const passphrase = getOptionalEnv("DHARMAWISATA_H2H_CLIENT_CERT_PASSPHRASE").trim()
  const rejectUnauthorized =
    getOptionalEnv("DHARMAWISATA_H2H_TLS_REJECT_UNAUTHORIZED", "true").toLowerCase() !== "false"

  if (!pfxPath && !(certPath && keyPath) && !caPath && rejectUnauthorized) return null

  return {
    cert: certPath ? readFileSync(certPath) : undefined,
    key: keyPath ? readFileSync(keyPath) : undefined,
    pfx: pfxPath ? readFileSync(pfxPath) : undefined,
    ca: caPath ? readFileSync(caPath) : undefined,
    passphrase: passphrase || undefined,
    rejectUnauthorized,
  }
}

function normalizeRequestBody(body: BodyInit | null | undefined) {
  if (!body) return undefined
  if (typeof body === "string") return body
  if (body instanceof URLSearchParams) return body.toString()
  throw new Error("Dharmawisata request body type is not supported by mTLS transport.")
}

async function dharmawisataNodeHttpsFetch(input: {
  url: string
  method: string
  headers?: HeadersInit
  body?: BodyInit | null
  timeoutMs: number
}) {
  const mtlsOptions = getDharmawisataMtlsOptions()
  if (!mtlsOptions) return null

  const requestBody = normalizeRequestBody(input.body)
  const headers = normalizeHeaders(input.headers)
  if (requestBody !== undefined && !headers["content-length"]) {
    headers["content-length"] = Buffer.byteLength(requestBody).toString()
  }

  return new Promise<Response>((resolve, reject) => {
    const request = https.request(
      input.url,
      {
        method: input.method,
        headers,
        timeout: input.timeoutMs,
        ...mtlsOptions,
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        response.on("end", () => {
          resolve(
            new Response(Buffer.concat(chunks), {
              status: response.statusCode || 0,
              statusText: response.statusMessage,
              headers: response.headers as HeadersInit,
            }),
          )
        })
      },
    )

    request.on("timeout", () => {
      request.destroy(new Error(`Dharmawisata request timed out after ${input.timeoutMs}ms`))
    })
    request.on("error", reject)
    if (requestBody !== undefined) request.write(requestBody)
    request.end()
  })
}

export function getDharmawisataClientConfig(): DharmawisataClientConfig {
  return {
    baseUrl: normalizeBaseUrl(
      getRequiredEnv("DHARMAWISATA_H2H_BASE_URL"),
    ),
    credentials: {
      userId: getRequiredEnv("DHARMAWISATA_H2H_USER_ID"),
      password: getRequiredEnv("DHARMAWISATA_H2H_PASSWORD"),
    },
  }
}

export function getDharmawisataBaseUrl() {
  return getDharmawisataClientConfig().baseUrl
}

export function getDharmawisataConfiguredPath(name: string) {
  return String(getOptionalEnv(name)).trim().replace(/^\/+/, "")
}

export function getDharmawisataCredentials() {
  return getDharmawisataClientConfig().credentials
}

export function getDharmawisataSecurityCode() {
  return getOptionalEnv("DHARMAWISATA_H2H_SECURITY_CODE").trim()
}

export function getDharmawisataAccessTokenOverride() {
  return getOptionalEnv("DHARMAWISATA_H2H_ACCESS_TOKEN").trim()
}

export function getDharmawisataTimeoutMs() {
  const configured = Number(getOptionalEnv("DHARMAWISATA_H2H_TIMEOUT_MS", "8000"))
  if (!Number.isFinite(configured) || configured <= 0) return 8000
  return configured
}

export async function dharmawisataFetch({
  path = "",
  method = "GET",
  headers,
  body,
  cache = "no-store",
  timeoutMs,
  next,
}: DharmawisataRequestOptions = {}) {
  const config = getDharmawisataClientConfig()
  const url = joinPath(config.baseUrl, path)
  const requestTimeoutMs = timeoutMs ?? getDharmawisataTimeoutMs()
  const mtlsResponse = url.startsWith("https://")
    ? await dharmawisataNodeHttpsFetch({
        url,
        method,
        headers,
        body,
        timeoutMs: requestTimeoutMs,
      })
    : null

  if (mtlsResponse) return mtlsResponse

  return fetch(url, {
    method,
    headers,
    body,
    cache,
    signal: AbortSignal.timeout(requestTimeoutMs),
    next,
  })
}

export async function dharmawisataJsonFetch({
  path = "",
  method = "POST",
  headers,
  body,
  cache = "no-store",
  timeoutMs,
  next,
}: Omit<DharmawisataRequestOptions, "body"> & {
  body?: unknown
}) {
  const response = await dharmawisataFetch({
    path,
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    },
    body: body === undefined ? null : JSON.stringify(body),
    cache,
    timeoutMs,
    next,
  })

  if (!response.ok) {
    throw new Error(`Dharmawisata request failed with status ${response.status}`)
  }

  return response.json()
}

export async function dharmawisataFormFetch({
  path = "",
  method = "POST",
  headers,
  body,
  cache = "no-store",
  timeoutMs,
  next,
}: Omit<DharmawisataRequestOptions, "body"> & {
  body?: Record<string, string | number | boolean | null | undefined>
}) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(body || {})) {
    if (value === undefined || value === null) continue
    params.set(key, String(value))
  }

  const response = await dharmawisataFetch({
    path,
    method,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      ...headers,
    },
    body: params,
    cache,
    timeoutMs,
    next,
  })

  if (!response.ok) {
    throw new Error(`Dharmawisata request failed with status ${response.status}`)
  }

  return response.json()
}

function md5(value: string) {
  return createHash("md5").update(value).digest("hex")
}

function padDateSegment(value: number) {
  return String(value).padStart(2, "0")
}

export function buildDharmawisataLoginToken(date = new Date()) {
  const year = date.getFullYear()
  const month = padDateSegment(date.getMonth() + 1)
  const day = padDateSegment(date.getDate())
  const hours = padDateSegment(date.getHours())
  const minutes = padDateSegment(date.getMinutes())
  const seconds = padDateSegment(date.getSeconds())

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

export function buildDharmawisataSecurityCode(token: string, password: string) {
  return md5(`${token}${md5(password)}`)
}

export function getDharmawisataAuthPayload(
  overrides?: Partial<DharmawisataCredentials>,
) {
  const credentials = getDharmawisataCredentials()

  return {
    userId: overrides?.userId ?? credentials.userId,
    password: overrides?.password ?? credentials.password,
  }
}

export async function dharmawisataLogin(
  options?: {
    language?: 1 | 2 | 3
  },
): Promise<DharmawisataAuthResponse> {
  const loginPath = getDharmawisataConfiguredPath("DHARMAWISATA_H2H_LOGIN_PATH")
  const credentials = getDharmawisataCredentials()
  const token = buildDharmawisataLoginToken()
  const securityCode =
    getDharmawisataSecurityCode() ||
    buildDharmawisataSecurityCode(token, credentials.password)

  return dharmawisataFormFetch({
    path: loginPath || "/Session/Login",
    method: "POST",
    body: {
      token,
      securityCode,
      language: options?.language ?? 1,
      userID: credentials.userId,
    },
  })
}

export function isDharmawisataConfigured() {
  return Boolean(
    getOptionalEnv("DHARMAWISATA_H2H_BASE_URL") &&
      getOptionalEnv("DHARMAWISATA_H2H_USER_ID") &&
      getOptionalEnv("DHARMAWISATA_H2H_PASSWORD"),
  )
}
