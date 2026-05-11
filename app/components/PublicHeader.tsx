import Image from "next/image"
import Link from "next/link"
import { dictionaries, type Locale } from "@/lib/i18n"
import { homeHeaderLock } from "@/app/components/home/shared/homeHeaderLock"
import PublicHeaderAccountControls from "@/app/components/PublicHeaderAccountControls"
import PublicHeaderLocaleSelect from "@/app/components/PublicHeaderLocaleSelect"
import { defaultNotificationItems } from "@/app/components/notifications/defaultNotifications"
import NotificationBellLink from "@/app/components/notifications/NotificationBellLink"
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
    ? "whitespace-nowrap rounded-full px-3 py-2 text-[14px] font-medium text-slate-900 transition hover:bg-black/5 hover:text-[#ef4423]"
    : "whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none"
  const activePackageLinkClass = isOverlay
    ? "whitespace-nowrap rounded-full px-3 py-2 text-[14px] font-semibold text-slate-950 transition hover:bg-black/5 hover:text-[#ef4423]"
    : "whitespace-nowrap rounded-full border border-orange-100 bg-[#fff6ec] px-3 py-2 text-orange-700 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:text-inherit sm:shadow-none"

  const topNav = (
    <nav className={`flex min-w-max items-center ${isOverlay ? "gap-1" : "gap-2 sm:gap-5"} text-[14px] font-medium text-slate-700 sm:text-[15px]`}>
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
    <nav className={`flex min-w-max items-center ${isOverlay ? "gap-1" : "gap-2 sm:gap-5"} text-sm font-medium text-slate-700 sm:text-[15px]`}>
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
        <div className="public-header-shell relative mx-auto max-w-7xl px-4 pt-5 md:px-6 md:pt-6">
          <div className="hidden flex-col items-center lg:flex">
            <div className={`${homeHeaderLock.desktopTopRowClass} text-slate-900`}>
              <a href="https://redfeng.co/" className="public-header-logo-link absolute left-0 top-6 flex items-center gap-2">
                <Image
                  src="/home-assets/logo-redfeng-header.png"
                  alt="Red Feng"
                  width={1536}
                  height={1024}
                  priority
                  className={`public-header-logo ${homeHeaderLock.desktopLogoClass}`}
                />
              </a>

              <nav className={homeHeaderLock.desktopTopNavClass}>
                {publicHeaderTopNavItems
                  .filter((item) => item.key !== "help")
                  .map((item) => (
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

              <div className="flex items-center gap-3">
                {renderPublicHeaderLink({
                  href: "/contact",
                  className: navLinkClass,
                  label: t.help,
                })}
                <div className="hidden lg:block">
                  <PublicHeaderLocaleSelect
                    locale={locale}
                    availableLocales={availableLocales}
                    mode="currency"
                    tone="glass-dark"
                    labels={{
                      language: t.language,
                      langId: t.langId,
                      langEn: t.langEn,
                      langZh: t.langZh,
                    }}
                  />
                </div>
                <NotificationBellLink
                  items={defaultNotificationItems}
                  className="text-slate-900 transition hover:text-[#ef4423]"
                  iconClassName="h-5 w-5"
                  badgeClassName="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#ef5b2a] px-1 text-[10px] font-bold text-white"
                />
                <PublicHeaderAccountControls
                  locale={locale}
                  redirectSuperadminFromHome={redirectSuperadminFromHome}
                  initialRole={initialRole}
                  variant={variant}
                />
              </div>
            </div>

            <div className={homeHeaderLock.desktopProductRowClass}>
              {productNav}
            </div>
          </div>

          <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden">
            <div className="flex min-w-max items-center gap-5 rounded-[24px] border border-white/35 bg-white/18 px-4 py-3 backdrop-blur-xl">
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
      </header>
    )
  }

  return (
    <header className="public-header border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf4_100%)]">
      <div className="public-header-shell relative mx-auto max-w-7xl px-4 py-3 md:px-6 md:py-5">
        <div className="flex flex-col gap-4 lg:gap-5">
          <div className="hidden flex-col items-center lg:flex">
            <div className={`${homeHeaderLock.desktopTopRowClass} text-slate-900`}>
              <a href="https://redfeng.co/" className="public-header-logo-link absolute left-0 top-6 flex items-center gap-2">
                <Image
                  src="/home-assets/logo-redfeng-header.png"
                  alt="Red Feng"
                  width={1536}
                  height={1024}
                  priority
                  className={`public-header-logo ${homeHeaderLock.desktopLogoClass}`}
                />
              </a>

              <nav className={homeHeaderLock.desktopTopNavClass}>
                {publicHeaderTopNavItems
                  .filter((item) => item.key !== "help")
                  .map((item) => (
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

              <div className="flex items-center gap-3">
                {renderPublicHeaderLink({
                  href: "/contact",
                  className: navLinkClass,
                  label: t.help,
                })}
                <div className="hidden lg:block">
                  <PublicHeaderLocaleSelect
                    locale={locale}
                    availableLocales={availableLocales}
                    mode="currency"
                    tone="glass-dark"
                    labels={{
                      language: t.language,
                      langId: t.langId,
                      langEn: t.langEn,
                      langZh: t.langZh,
                    }}
                  />
                </div>
                <NotificationBellLink
                  items={defaultNotificationItems}
                  className="text-slate-900 transition hover:text-[#ef4423]"
                  iconClassName="h-5 w-5"
                  badgeClassName="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#ef5b2a] px-1 text-[10px] font-bold text-white"
                />
                <PublicHeaderAccountControls
                  locale={locale}
                  redirectSuperadminFromHome={redirectSuperadminFromHome}
                  initialRole={initialRole}
                  variant={variant}
                />
              </div>
            </div>

            <div className={homeHeaderLock.desktopProductRowClass}>
              {productNav}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 lg:hidden">
            <a href="https://redfeng.co/" className="public-header-logo-link flex items-center gap-3">
              <Image
                src="/home-assets/logo-redfeng-header.png"
                alt="Red Feng"
                width={1536}
                height={1024}
                priority
                className="public-header-logo h-9 w-auto sm:h-14"
              />
            </a>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <PublicHeaderLocaleSelect
                  locale={locale}
                  availableLocales={availableLocales}
                  mode="currency"
                  tone="dark"
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

          <div className="public-header-topnav overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden">
            {topNav}
          </div>

          <div className="public-header-productnav overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden">
            {productNav}
          </div>
        </div>
      </div>
    </header>
  )
}
