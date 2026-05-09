import Image from "next/image"
import Link from "next/link"
import { MenuIcon } from "@/app/components/home/shared/homeContent"
import { defaultNotificationItems } from "@/app/components/notifications/defaultNotifications"
import NotificationBellLink from "@/app/components/notifications/NotificationBellLink"
import { servicePageConfigByLabel } from "@/app/components/services/serviceCatalog"
import type { Locale } from "@/lib/i18n"
import HeroHeaderCurrencySelect from "@/app/components/home/web/hero/HeroHeaderCurrencySelect"

export default function HeroHeader({ locale }: { locale: Locale }) {
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
            <Link href="/promo" className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">Promo</Link>
            <Link href="/customer/bookings" className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">Pesanan</Link>
            <Link href="https://redfeng.co/kemitraan_tour/" className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">Kemitraan Tour</Link>
            <Link href="/verifikasi-invoice" className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">Verifikasi Invoice Tour</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/contact" className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">Bantuan</Link>
            <HeroHeaderCurrencySelect locale={locale} />
            <NotificationBellLink
              items={defaultNotificationItems}
              className="text-white transition hover:text-[#ffd2c4]"
              iconClassName="h-5 w-5"
              badgeClassName="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#ef5b2a] px-1 text-[10px] font-bold text-white"
            />
            <Link href="/login" className="whitespace-nowrap rounded-[16px] bg-[#ff5a43] px-7 py-3 text-[14px] font-semibold text-white shadow-[0_16px_30px_-18px_rgba(239,90,67,0.72)]">
              Login / Daftar
            </Link>
          </div>
        </div>

        <div className="mt-1 flex w-[76.5%] items-center justify-center px-8 py-3">
          <nav className="home-hero-primary-nav flex items-center gap-1 text-[15px] font-semibold text-white">
            <Link href={servicePageConfigByLabel["Pesawat"].href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">Pesawat</Link>
            <Link href={servicePageConfigByLabel["Hotel"].href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">Hotel</Link>
            <Link href={servicePageConfigByLabel["Kereta"].href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">Kereta</Link>
            <Link href={servicePageConfigByLabel["Bus"].href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">Bus</Link>
            <Link href={servicePageConfigByLabel["Kapal"].href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">Kapal</Link>
            <Link href={servicePageConfigByLabel["Kapal Pesiar"].href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">Kapal Pesiar</Link>
            <Link href={servicePageConfigByLabel["Aktivitas"].href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">Aktivitas</Link>
            <Link href="/packages" className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/12 hover:text-[#ffd2c4]">Paket Wisata</Link>
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
