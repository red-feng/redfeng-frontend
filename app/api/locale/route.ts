import { NextResponse } from "next/server"
import { defaultLocale, localeCookieName, normalizeLocale } from "@/lib/i18n"

function resolveCookieDomain(req: Request) {
  const host = new URL(req.url).hostname.toLowerCase()
  if (host === "redfeng.co" || host.endsWith(".redfeng.co")) {
    return ".redfeng.co"
  }
  return undefined
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { locale?: string }
  const locale = normalizeLocale(body.locale || defaultLocale)
  const domain = resolveCookieDomain(req)

  const res = NextResponse.json({ ok: true, locale })
  res.cookies.set(localeCookieName, locale, {
    path: "/",
    domain,
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 365,
  })

  return res
}
