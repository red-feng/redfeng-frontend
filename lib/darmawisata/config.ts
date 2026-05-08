import { getOptionalEnv, getRequiredEnv } from "@/lib/env"

export type DarmaWisataServiceKey = "flight" | "hotel" | "train" | "bus" | "ship"

export type DarmaWisataRuntimeConfig = {
  baseUrl: string
  username: string
  password: string
  swaggerUrl: string
  manualUrl: string
  ticketExampleUrl: string
  timeoutMs: number
  enabledServices: DarmaWisataServiceKey[]
}

const DEFAULT_DARMAWISATA_SERVICES: DarmaWisataServiceKey[] = ["flight", "hotel", "train", "bus", "ship"]

export function getDarmaWisataRuntimeConfig(): DarmaWisataRuntimeConfig {
  return {
    baseUrl: stripTrailingSlash(getRequiredEnv("DARMAWISATA_H2H_BASE_URL")),
    username: getRequiredEnv("DARMAWISATA_H2H_USERNAME"),
    password: getRequiredEnv("DARMAWISATA_H2H_PASSWORD"),
    swaggerUrl: getOptionalEnv("DARMAWISATA_H2H_SWAGGER_URL"),
    manualUrl: getOptionalEnv("DARMAWISATA_H2H_MANUAL_URL"),
    ticketExampleUrl: getOptionalEnv("DARMAWISATA_H2H_TICKET_EXAMPLE_URL"),
    timeoutMs: parseTimeoutMs(getOptionalEnv("DARMAWISATA_H2H_TIMEOUT_MS", "10000")),
    enabledServices: parseEnabledServices(getOptionalEnv("DARMAWISATA_H2H_ENABLED_SERVICES")),
  }
}

export function isDarmaWisataConfigured() {
  return Boolean(
    process.env.DARMAWISATA_H2H_BASE_URL && process.env.DARMAWISATA_H2H_USERNAME && process.env.DARMAWISATA_H2H_PASSWORD,
  )
}

export function getDarmaWisataPublicConfig() {
  return {
    configured: isDarmaWisataConfigured(),
    baseUrl: stripTrailingSlash(getOptionalEnv("DARMAWISATA_H2H_BASE_URL")),
    swaggerUrl: getOptionalEnv("DARMAWISATA_H2H_SWAGGER_URL"),
    manualUrl: getOptionalEnv("DARMAWISATA_H2H_MANUAL_URL"),
    ticketExampleUrl: getOptionalEnv("DARMAWISATA_H2H_TICKET_EXAMPLE_URL"),
    timeoutMs: parseTimeoutMs(getOptionalEnv("DARMAWISATA_H2H_TIMEOUT_MS", "10000")),
    enabledServices: parseEnabledServices(getOptionalEnv("DARMAWISATA_H2H_ENABLED_SERVICES")),
  }
}

function parseEnabledServices(raw: string): DarmaWisataServiceKey[] {
  if (!raw.trim()) return DEFAULT_DARMAWISATA_SERVICES

  const supported = new Set<DarmaWisataServiceKey>(DEFAULT_DARMAWISATA_SERVICES)
  const services = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is DarmaWisataServiceKey => supported.has(item as DarmaWisataServiceKey))

  return services.length > 0 ? Array.from(new Set(services)) : DEFAULT_DARMAWISATA_SERVICES
}

function parseTimeoutMs(raw: string) {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return 10000
  return parsed
}

function stripTrailingSlash(input: string) {
  return input.replace(/\/+$/, "")
}
