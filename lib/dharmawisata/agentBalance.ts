import {
  dharmawisataJsonFetch,
  dharmawisataLogin,
  getDharmawisataConfiguredPath,
  getDharmawisataCredentials,
  isDharmawisataConfigured,
} from "@/lib/dharmawisata/client"

type JsonRecord = Record<string, unknown>

export type DharmawisataAgentBalanceResult = {
  ok: boolean
  skipped: boolean
  message: string
  status: string
  balance: number | null
  balanceFormatted: string
  respTime: string | null
  userId: string | null
  raw: JsonRecord
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : ""
}

function normalizeMoney(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function formatIdr(value: number | null) {
  if (value === null) return "-"
  return `IDR ${Math.round(value).toLocaleString("id-ID")}`
}

function redactAgentBalanceResponse(raw: JsonRecord) {
  return {
    ...raw,
    accessToken: normalizeText(raw.accessToken) ? "present-redacted" : "",
  }
}

export async function getDharmawisataAgentBalance(): Promise<DharmawisataAgentBalanceResult> {
  if (!isDharmawisataConfigured()) {
    return {
      ok: false,
      skipped: true,
      message: "Konfigurasi Dharmawisata belum lengkap untuk cek saldo agent.",
      status: "",
      balance: null,
      balanceFormatted: "-",
      respTime: null,
      userId: null,
      raw: { balanceMode: "manual_unconfigured" },
    }
  }

  try {
    const auth = await dharmawisataLogin({ language: 1 })
    const accessToken = normalizeText(auth.accessToken)

    if (!accessToken) {
      return {
        ok: false,
        skipped: false,
        message: auth.respMessage || "Login Dharmawisata berhasil dipanggil, tetapi access token kosong.",
        status: auth.status || "",
        balance: null,
        balanceFormatted: "-",
        respTime: auth.respTime || null,
        userId: auth.userID || getDharmawisataCredentials().userId,
        raw: {
          balanceMode: "api",
          auth: {
            ...auth,
            accessToken: auth.accessToken ? "present-redacted" : "",
          },
          error: "empty_access_token",
        },
      }
    }

    const credentials = getDharmawisataCredentials()
    const response = await dharmawisataJsonFetch({
      path: getDharmawisataConfiguredPath("DHARMAWISATA_H2H_AGENT_BALANCE_PATH") || "/Agent/Balance",
      method: "POST",
      body: {
        userID: credentials.userId,
        accessToken,
      },
    })
    const raw = asRecord(response)
    const status = normalizeText(raw.status)
    const message = normalizeText(raw.respMessage || raw.message)
    const balance = normalizeMoney(raw.balance)
    const ok = status.toUpperCase() === "SUCCESS" && balance !== null

    return {
      ok,
      skipped: false,
      message: message || (ok ? "Saldo agent Dharmawisata berhasil dibaca." : "Saldo agent Dharmawisata belum bisa dibaca."),
      status,
      balance,
      balanceFormatted: formatIdr(balance),
      respTime: normalizeText(raw.respTime) || null,
      userId: normalizeText(raw.userID) || credentials.userId,
      raw: {
        balanceMode: "api",
        request: {
          path: getDharmawisataConfiguredPath("DHARMAWISATA_H2H_AGENT_BALANCE_PATH") || "/Agent/Balance",
          userID: credentials.userId,
          hasAccessToken: true,
        },
        response: redactAgentBalanceResponse(raw),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dharmawisata agent balance gagal tanpa pesan error."

    return {
      ok: false,
      skipped: false,
      message,
      status: "",
      balance: null,
      balanceFormatted: "-",
      respTime: null,
      userId: getDharmawisataCredentials().userId,
      raw: { balanceMode: "api", error: message },
    }
  }
}
