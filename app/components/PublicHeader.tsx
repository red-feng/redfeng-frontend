import Image from "next/image"
import Link from "next/link"
import { dictionaries, type Locale } from "@/lib/i18n"
import PublicHeaderAccountControls from "@/app/components/PublicHeaderAccountControls"
import PublicHeaderLocaleSelect from "@/app/components/PublicHeaderLocaleSelect"
import {
  getPublicHeaderActivityLabel,
  publicHeaderProductNavItems,
  publicHeaderTopNavItems,
} from "@/app/components/publicHeaderNav"
import { createClient } from "@/lib/supabase/server"
import { resolvePublicAccountRole, type PublicAccountRole } from "@/lib/login-role-lock"

type PublicHeaderProps = {
  locale: Locale
  languageOptions?: Locale[]
  redirectSuperadminFromHome?: boolean
  variant?: "default" | "overlay"
}

function renderPublicHeaderLink({
  href,
  className,
  label,
  external = false,
}: {
  href: string
  className: string
  label: string
  external?: boolean
}) {
  return external ? (
    <a href={href} className={className}>
      {label}
    </a>
  ) : (
    <Link href={href} className={className}>
      {label}
    </Link>
  )
}

export default async function PublicHeader({
  locale,
  languageOptions,
  redirectSuperadminFromHome = false,
  variant = "default",
}: PublicHeaderProps) {
  const supabase = await createClient("customer")
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let initialRole: PublicAccountRole = "guest"

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    initialRole = resolvePublicAccountRole(profile?.role)
  }

  const t = dictionaries[locale].header
  const availableLocales =
    languageOptions && languageOptions.length > 0 ? languageOptions : (["id", "en", "zh"] as Locale[])
  const isOverlay = variant === "overlay"
  const activityLabel = getPublicHeaderActivityLabel(locale)
  const navLinkClass = isOverlay
    ? "whitespace-nowrap px-1 py-2 text-[15px] font-medium text-slate-700 transition hover:text-orange-600"
    : "whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none"
  const activePackageLinkClass = isOverlay
    ? "whitespace-nowrap border-b-2 border-[#ef4423] px-1 py-2 text-[15px] font-semibold text-[#ef4423] transition hover:text-orange-600"
    : "whitespace-nowrap rounded-full border border-orange-100 bg-[#fff6ec] px-3 py-2 text-orange-700 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:text-inherit sm:shadow-none"

  const topNav = (
    <nav className={`flex min-w-max items-center ${isOverlay ? "gap-5" : "gap-2 sm:gap-5"} text-[14px] font-medium text-slate-700 sm:text-[15px]`}>
      {publicHeaderTopNavItems.map((item) => (
        <div key={item.key}>
          {renderPublicHeaderLink({
            href: item.href,
            className: navLinkClass,
            label: t[item.key as keyof typeof t],
            external: item.external,
          })}
        </div>
      ))}
    </nav>
  )

  const productNav = (
    <nav className={`flex min-w-max items-center ${isOverlay ? "gap-5" : "gap-2 sm:gap-5"} text-sm font-medium text-slate-700 sm:text-[15px]`}>
      {publicHeaderProductNavItems.map((item) => (
        <Link key={item.key} href={item.href} className={item.key === "packageTour" ? activePackageLinkClass : navLinkClass}>
          {item.key === "activity" ? activityLabel : t[item.key as keyof typeof t]}
        </Link>
      ))}
    </nav>
  )

  if (isOverlay) {
    return (
      <header className="public-header absolute inset-x-0 top-0 z-40">
        <div className="public-header-shell mx-auto max-w-7xl px-4 py-3 pt-5 md:px-6 md:py-5 md:pt-6">
          <div className="rounded-[30px] border border-white/40 bg-white/40 px-4 py-3 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.16)] backdrop-blur-2xl md:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <a href="https://redfeng.co/" className="public-header-logo-link flex items-center gap-3">
                  <Image
                    src="/home-assets/logo-redfeng-header.png"
                    alt="Red Feng"
                    width={1536}
                    height={1024}
                    priority
                    className="public-header-logo h-9 w-auto sm:h-12 md:h-14"
                  />
                </a>

                <div className="hidden xl:flex xl:flex-1 xl:justify-center">{topNav}</div>

                <div className="flex items-center gap-3">
                  <div className="hidden lg:block">
                    <PublicHeaderLocaleSelect
                      locale={locale}
                      availableLocales={availableLocales}
                      labels={{
                        language: t.language,
                        langId: t.langId,
                        langEn: t.langEn,
                        langZh: t.langZh,
                      }}
                    />
                  </div>
                  <PublicHeaderAccountControls
                    locale={locale}
                    redirectSuperadminFromHome={redirectSuperadminFromHome}
                    initialRole={initialRole}
                    variant={variant}
                  />
                </div>
              </div>

              <div className="hidden overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:block">
                {productNav}
              </div>

              <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:hidden">
                <div className="flex min-w-max items-center gap-5">
                  {publicHeaderTopNavItems.map((item) => (
                    <div key={item.key}>
                      {renderPublicHeaderLink({
                        href: item.href,
                        className: navLinkClass,
                        label: t[item.key as keyof typeof t],
                        external: item.external,
                      })}
                    </div>
                  ))}
                  {publicHeaderProductNavItems.map((item) => (
                    <Link key={item.key} href={item.href} className={item.key === "packageTour" ? activePackageLinkClass : navLinkClass}>
                      {item.key === "activity" ? activityLabel : t[item.key as keyof typeof t]}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="public-header border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf4_100%)]">
      <div className="public-header-shell mx-auto max-w-7xl px-4 py-3 md:px-6 md:py-5">
        <div className="flex flex-col gap-4 lg:gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <a href="https://redfeng.co/" className="public-header-logo-link flex items-center gap-3">
              <Image
                src="/home-assets/logo-redfeng-header.png"
                alt="Red Feng"
                width={1536}
                height={1024}
                priority
                className="public-header-logo h-9 w-auto sm:h-14 md:h-16 lg:h-20"
              />
            </a>

            <div className="hidden xl:flex xl:flex-1 xl:justify-center">{topNav}</div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:block">
                <PublicHeaderLocaleSelect
                  locale={locale}
                  availableLocales={availableLocales}
                  labels={{
                    language: t.language,
                    langId: t.langId,
                    langEn: t.langEn,
                    langZh: t.langZh,
                  }}
                />
              </div>
              <PublicHeaderAccountControls
                locale={locale}
                redirectSuperadminFromHome={redirectSuperadminFromHome}
                initialRole={initialRole}
                variant={variant}
              />
            </div>
          </div>

          <div className="public-header-topnav overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:hidden">
            {topNav}
          </div>

          <div className="public-header-productnav hidden overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:block">
            {productNav}
          </div>
        </div>
      </div>
    </header>
  )
}
