import { NextResponse } from "next/server"
import { defaultLocale, localeCookieName, normalizeLocale } from "@/lib/i18n"

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { locale?: string }
  const locale = normalizeLocale(body.locale || defaultLocale)

  const res = NextResponse.json({ ok: true, locale })
  res.cookies.set(localeCookieName, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  })

  return res
}
