import Image from "next/image"
import Link from "next/link"
import { MenuIcon } from "@/app/components/home/shared/homeContent"
import { defaultNotificationItems } from "@/app/components/notifications/defaultNotifications"
import NotificationBellLink from "@/app/components/notifications/NotificationBellLink"
import PublicHeaderLocaleSelect from "@/app/components/PublicHeaderLocaleSelect"
import {
  getPublicHeaderActivityLabel,
  publicHeaderProductNavItems,
  publicHeaderTopNavItems,
} from "@/app/components/publicHeaderNav"
import { dictionaries, type Locale } from "@/lib/i18n"

export default function HeroHeader({ locale }: { locale: Locale }) {
  const t = dictionaries[locale].header
  const copy = {
    id: {
      loginRegister: "Login / Daftar",
    },
    en: {
      loginRegister: "Login / Register",
    },
    zh: {
      loginRegister: "\u767b\u5f55 / \u6ce8\u518c",
    },
  }[locale]
  const activityLabel = getPublicHeaderActivityLabel(locale)

  return (
    <header className="home-hero-header relative z-10 min-h-[158px]">
      <Link href="/" className="home-hero-logo-link absolute left-0 top-2 flex items-center gap-2">
        <Image
          src="/home-assets/logo-redfeng-header.png"
          alt="RedFeng"
          width={1536}
          height={1024}
          quality={100}
          unoptimized
          priority
          className="home-hero-logo h-[9.5rem] w-[24.75rem] object-contain object-left"
        />
      </Link>

      <div className="hidden flex-col items-center lg:flex">
        <div className="flex w-full items-center justify-end gap-5 pr-1 pt-2 text-[14px] font-medium text-white">
          <nav className="ml-[12rem] flex items-center gap-1">
            {publicHeaderTopNavItems
              .filter((item) => item.key !== "help")
              .map((item) =>
                item.external ? (
                  <a key={item.key} href={item.href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">
                    {t[item.key as keyof typeof t]}
                  </a>
                ) : (
                  <Link key={item.key} href={item.href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">
                    {t[item.key as keyof typeof t]}
                  </Link>
                ),
              )}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/contact" className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">
              {t.help}
            </Link>
            <PublicHeaderLocaleSelect
              locale={locale}
              availableLocales={["id", "en", "zh"]}
              mode="currency"
              labels={{
                language: "Currency",
                langId: "Indonesia",
                langEn: "English",
                langZh: "China",
              }}
            />
            <NotificationBellLink
              items={defaultNotificationItems}
              className="text-white transition hover:text-[#ffd2c4]"
              iconClassName="h-5 w-5"
              badgeClassName="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#ef5b2a] px-1 text-[10px] font-bold text-white"
            />
            <Link href="/login" className="whitespace-nowrap rounded-[16px] bg-[#ff5a43] px-7 py-3 text-[14px] font-semibold text-white shadow-[0_16px_30px_-18px_rgba(239,90,67,0.72)]">
              {copy.loginRegister}
            </Link>
          </div>
        </div>

        <div className="mt-1 flex w-[76.5%] items-center justify-center px-8 py-3">
          <nav className="home-hero-primary-nav flex items-center gap-1 text-[15px] font-semibold text-white">
            {publicHeaderProductNavItems.map((item) => (
              <Link key={item.key} href={item.href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">
                {item.key === "activity" ? activityLabel : t[item.key as keyof typeof t]}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="home-hero-mobile-actions flex items-center justify-end gap-2 lg:hidden">
        <NotificationBellLink
          items={defaultNotificationItems}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/85 text-slate-700 shadow-sm"
          iconClassName="h-5 w-5"
          badgeClassName="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#ef5b2a] px-1 text-[10px] font-bold text-white"
        />
        <button className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/85 text-slate-700 shadow-sm">
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
