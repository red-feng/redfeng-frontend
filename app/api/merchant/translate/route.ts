import { NextResponse } from "next/server"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { translateMerchantText } from "@/lib/merchant-auto-translation"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string
      sourceLanguage?: string
      targetLanguages?: string[]
    }

    const text = String(body.text || "")
    const sourceLanguage = normalizeLocale(body.sourceLanguage || "id")
    const targetLanguages = Array.from(
      new Set((body.targetLanguages || []).map((language) => normalizeLocale(language))),
    ).filter((language) => language !== sourceLanguage) as Locale[]

    if (!text.trim() || targetLanguages.length === 0) {
      return NextResponse.json({ translations: {} })
    }

    const translatedEntries = await Promise.all(
      targetLanguages.map(async (targetLanguage) => [
        targetLanguage,
        await translateMerchantText(text, sourceLanguage, targetLanguage),
      ] as const),
    )

    return NextResponse.json({
      translations: Object.fromEntries(translatedEntries),
    })
  } catch (error) {
    console.error("merchant translate route error:", error)
    return NextResponse.json(
      { error: "Gagal melakukan terjemahan otomatis." },
      { status: 500 },
    )
  }
}
