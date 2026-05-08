import Image from "next/image"
import Link from "next/link"
import { ChevronDownIcon, MenuIcon } from "@/app/components/home/shared/homeContent"
import { defaultNotificationItems } from "@/app/components/notifications/defaultNotifications"
import NotificationBellLink from "@/app/components/notifications/NotificationBellLink"
import { servicePageConfigByLabel } from "@/app/components/services/serviceCatalog"

export default function HeroHeader() {
  return (
    <header className="home-hero-header relative z-10 flex items-center justify-between gap-4">
      <Link href="/" className="home-hero-logo-link flex items-center gap-2">
        <Image
          src="/home-assets/logo-redfeng-header.png"
          alt="RedFeng"
          width={1536}
          height={1024}
          quality={100}
          unoptimized
          priority
          className="home-hero-logo h-[3.1rem] w-[9.8rem] object-contain object-left sm:h-[3.5rem] sm:w-[11rem]"
        />
      </Link>

      <div className="hidden items-center gap-5 rounded-[24px] border border-white/30 bg-[#0e2b4f]/58 px-5 py-2.5 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.42)] backdrop-blur-[12px] lg:flex">
        <nav className="home-hero-primary-nav flex items-center gap-1.5 text-[15px] font-medium text-white">
          <Link href={servicePageConfigByLabel["Pesawat"].href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/14 hover:text-[#ffd2c4]">Pesawat</Link>
          <Link href={servicePageConfigByLabel["Hotel"].href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/14 hover:text-[#ffd2c4]">Hotel</Link>
          <Link href={servicePageConfigByLabel["Kereta"].href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/14 hover:text-[#ffd2c4]">Kereta</Link>
          <Link href={servicePageConfigByLabel["Bus"].href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/14 hover:text-[#ffd2c4]">Bus</Link>
          <Link href={servicePageConfigByLabel["Kapal"].href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/14 hover:text-[#ffd2c4]">Kapal</Link>
          <Link href={servicePageConfigByLabel["Kapal Pesiar"].href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/14 hover:text-[#ffd2c4]">Kapal Pesiar</Link>
          <Link href={servicePageConfigByLabel["Aktivitas"].href} className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/14 hover:text-[#ffd2c4]">Aktivitas</Link>
          <Link href="/packages" className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/14 hover:text-[#ffd2c4]">Paket Wisata</Link>
          <Link href="/promo" className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-white/14 hover:text-[#ffd2c4]">Promo</Link>
        </nav>

        <div className="home-hero-secondary-actions flex items-center gap-4 border-l border-white/25 pl-4">
          <Link href="/contact" className="text-sm text-white transition hover:text-[#ffd2c4]">Bantuan</Link>
          <button className="flex items-center gap-1 text-sm text-white transition hover:text-[#ffd2c4]">
            IDR
            <ChevronDownIcon className="h-4 w-4" />
          </button>
          <NotificationBellLink
            items={defaultNotificationItems}
            className="text-white transition hover:text-[#ffd2c4]"
            iconClassName="h-5 w-5"
            badgeClassName="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#ef5b2a] px-1 text-[10px] font-bold text-white"
          />
          <Link href="/login" className="whitespace-nowrap rounded-xl bg-[#ff5a43] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_24px_-18px_rgba(239,90,67,0.6)]">
            Login / Daftar
          </Link>
        </div>
      </div>

      <div className="home-hero-mobile-actions flex items-center gap-2 lg:hidden">
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
