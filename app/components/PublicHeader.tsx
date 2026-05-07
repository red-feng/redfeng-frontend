import Image from "next/image"
import Link from "next/link"
import { dictionaries, type Locale } from "@/lib/i18n"
import PublicHeaderAccountControls from "@/app/components/PublicHeaderAccountControls"
import PublicHeaderLocaleSelect from "@/app/components/PublicHeaderLocaleSelect"
import { createClient } from "@/lib/supabase/server"
import { resolvePublicAccountRole, type PublicAccountRole } from "@/lib/login-role-lock"
import { servicePageConfigByLabel } from "@/app/components/services/serviceCatalog"

type PublicHeaderProps = {
  locale: Locale
  languageOptions?: Locale[]
  redirectSuperadminFromHome?: boolean
}

export default async function PublicHeader({ locale, languageOptions, redirectSuperadminFromHome = false }: PublicHeaderProps) {
  const supabase = await createClient("customer")
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let initialRole: PublicAccountRole = "guest"

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    initialRole = resolvePublicAccountRole(profile?.role)
  }

  const t = dictionaries[locale].header
  const availableLocales =
    languageOptions && languageOptions.length > 0 ? languageOptions : (["id", "en", "zh"] as Locale[])

  return (
    <header className="public-header border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf4_100%)]">
      <div className="public-header-shell mx-auto max-w-7xl px-4 py-3 md:px-6 md:py-5">
        <div className="flex flex-col gap-4 lg:gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

            <PublicHeaderAccountControls
              locale={locale}
              redirectSuperadminFromHome={redirectSuperadminFromHome}
              initialRole={initialRole}
            />
          </div>

          <div className="public-header-topnav hidden overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:block">
            <nav className="flex min-w-max items-center gap-2 text-sm font-medium text-slate-700 sm:gap-5 sm:text-[15px]">
              <Link href="/promo" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.promo}</Link>
              <Link href="/customer/bookings" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.orders}</Link>
              <a href="https://redfeng.co/kemitraan_tour/" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.partnerTour}</a>
              <Link href="/verifikasi-invoice" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.verifyInvoice}</Link>
              <Link href="/contact" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.help}</Link>
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
            </nav>
          </div>

          <div className="public-header-productnav hidden overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:block">
            <nav className="flex min-w-max items-center gap-2 text-sm font-medium text-slate-700 sm:gap-5 sm:text-[15px]">
              <Link href="/packages" className="whitespace-nowrap rounded-full border border-orange-100 bg-[#fff6ec] px-3 py-2 text-orange-700 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:text-inherit sm:shadow-none">{t.packageTour}</Link>
              <Link href={servicePageConfigByLabel["Pesawat"].href} className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.flight}</Link>
              <Link href={servicePageConfigByLabel["Hotel"].href} className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.hotel}</Link>
              <Link href={servicePageConfigByLabel["Bus"].href} className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.busTravel}</Link>
              <Link href={servicePageConfigByLabel["Kereta"].href} className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.train}</Link>
              <Link href={servicePageConfigByLabel["Kapal"].href} className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.seaShip}</Link>
              <Link href={servicePageConfigByLabel["Kapal Pesiar"].href} className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.cruise}</Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}
