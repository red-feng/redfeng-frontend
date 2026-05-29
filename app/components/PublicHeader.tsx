import Image from "next/image"
import Link from "next/link"
import { dictionaries, type Locale } from "@/lib/i18n"
import { homeHeaderLock } from "@/app/components/home/shared/homeHeaderLock"
import { publicHeaderBaseline } from "@/app/components/publicHeaderBaseline"
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
    ? "whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]"
    : "whitespace-nowrap rounded-full px-3 py-2 text-[14px] font-medium text-slate-900 transition hover:bg-black/5 hover:text-[#ef4423]"
  const activePackageLinkClass = isOverlay
    ? navLinkClass
    : "whitespace-nowrap rounded-full px-3 py-2 text-[14px] font-semibold text-slate-950 transition hover:bg-black/5 hover:text-[#ef4423]"

  const topNav = (
    <nav className={`flex min-w-max items-center gap-1 text-[14px] font-medium text-slate-700 sm:text-[15px]`}>
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
    <nav className={`flex min-w-max items-center gap-1 text-sm font-semibold text-slate-700 sm:text-[15px]`}>
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
        <div className={`public-header-shell ${publicHeaderBaseline.desktopShellClass} ${publicHeaderBaseline.desktopOverlayPaddingClass}`}>
          <div className="relative z-10 hidden min-h-[148px] flex-col items-center lg:flex">
            <div className={`${homeHeaderLock.desktopTopRowClass} text-white`}>
              <a
                href="https://redfeng.co/"
                className={`public-header-logo-link z-0 ${publicHeaderBaseline.desktopLogoAnchorClass} ${publicHeaderBaseline.desktopOverlayLogoLiftClass}`}
              >
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
                  href: "/bantuan",
                  className: navLinkClass,
                  label: t.help,
                })}
                <div className="hidden lg:block">
                  <PublicHeaderLocaleSelect
                    locale={locale}
                    availableLocales={availableLocales}
                    mode="currency"
                    tone={publicHeaderBaseline.desktopLocaleTone}
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
                  className="text-white transition hover:text-[#ffd2c4]"
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
              <nav className={`flex items-center gap-1 font-semibold text-white`}>
                {publicHeaderProductNavItems.map((item) => (
                  <Link key={item.key} href={item.href} className={item.key === "packageTour" ? activePackageLinkClass : navLinkClass}>
                    {item.key === "activity" ? activityLabel : t[item.key as keyof typeof t]}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          <div className="space-y-3 lg:hidden">
            <div className="flex items-center justify-between gap-3 px-1 py-2">
              <a href="https://redfeng.co/" className="public-header-logo-link flex items-center">
                <Image
                  src="/home-assets/logo-redfeng-header.png"
                  alt="Red Feng"
                  width={1536}
                  height={1024}
                  priority
                  className="public-header-logo h-10 w-auto object-contain object-left"
                />
              </a>

              <div className="flex items-center gap-2.5">
                <div className="hidden sm:block">
                  <PublicHeaderLocaleSelect
                    locale={locale}
                    availableLocales={availableLocales}
                    mode="currency"
                    tone={publicHeaderBaseline.desktopLocaleTone}
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

            <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max items-center gap-2 rounded-[20px] border border-white/35 bg-white/20 px-3 py-2 backdrop-blur-lg">
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
                <span className="mx-1 h-5 w-px bg-slate-300/60" aria-hidden="true" />
                {publicHeaderProductNavItems.map((item) => (
                  <Link key={item.key} href={item.href} className={item.key === "packageTour" ? activePackageLinkClass : navLinkClass}>
                    {item.key === "activity" ? activityLabel : t[item.key as keyof typeof t]}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="public-header border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf4_100%)]">
      <div className={`public-header-shell ${publicHeaderBaseline.desktopShellClass} ${publicHeaderBaseline.desktopDefaultPaddingClass}`}>
        <div className="flex flex-col gap-4 lg:gap-0">
          <div className="relative z-10 hidden min-h-[158px] flex-col items-center lg:flex">
            <div className={`${homeHeaderLock.desktopTopRowClass} text-slate-900`}>
              <a href="https://redfeng.co/" className={`public-header-logo-link z-0 ${publicHeaderBaseline.desktopLogoAnchorClass} ${publicHeaderBaseline.desktopDefaultLogoLiftClass}`}>
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
                  href: "/bantuan",
                  className: navLinkClass,
                  label: t.help,
                })}
                <div className="hidden lg:block">
                  <PublicHeaderLocaleSelect
                    locale={locale}
                    availableLocales={availableLocales}
                    mode="currency"
                    tone={publicHeaderBaseline.desktopLocaleTone}
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
