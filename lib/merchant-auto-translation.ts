import { normalizeLocale, type Locale } from "@/lib/i18n"

const googleLanguageMap: Record<Locale, string> = {
  id: "id",
  en: "en",
  zh: "zh-CN",
}

async function translateWithGoogle(text: string, sourceLanguage: Locale, targetLanguage: Locale) {
  const url = new URL("https://translate.googleapis.com/translate_a/single")
  url.searchParams.set("client", "gtx")
  url.searchParams.set("sl", googleLanguageMap[sourceLanguage])
  url.searchParams.set("tl", googleLanguageMap[targetLanguage])
  url.searchParams.set("dt", "t")
  url.searchParams.set("q", text)

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Translation request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as unknown
  const chunks = Array.isArray(payload) && Array.isArray(payload[0]) ? payload[0] : []

  return chunks
    .map((chunk) => (Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : ""))
    .join("")
}

export async function translateMerchantText(text: string, sourceLanguage: string, targetLanguage: string) {
  const source = normalizeLocale(sourceLanguage)
  const target = normalizeLocale(targetLanguage)
  const normalizedText = text.trim()

  if (!normalizedText) return ""
  if (source === target) return text

  try {
    return await translateWithGoogle(text, source, target)
  } catch (error) {
    console.error("translateMerchantText error:", error)
    return text
  }
}
