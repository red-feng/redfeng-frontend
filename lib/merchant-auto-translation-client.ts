import type { Locale } from "@/lib/i18n"

export async function requestMerchantAutoTranslations(params: {
  text: string
  sourceLanguage: Locale
  targetLanguages: Locale[]
}) {
  const response = await fetch("/api/merchant/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error("Gagal menerjemahkan konten otomatis.")
  }

  const payload = (await response.json()) as {
    translations?: Partial<Record<Locale, string>>
  }

  return payload.translations || {}
}
