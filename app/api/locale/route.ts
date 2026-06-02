import { NextResponse } from "next/server"
import { defaultLocale, localeCookieName, normalizeLocale } from "@/lib/i18n"
import { resolveCookieDomainForHostname } from "@/lib/site-config"

function resolveCookieDomain(req: Request) {
  return resolveCookieDomainForHostname(new URL(req.url).hostname)
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
