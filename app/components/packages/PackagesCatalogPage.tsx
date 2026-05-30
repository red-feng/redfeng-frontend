import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import PackagesCatalogInteractiveClient from "@/app/components/packages/PackagesCatalogInteractiveClient"
import { getCurrentLocale } from "@/lib/locale"
import { getPublicCatalogData } from "@/lib/public-package-catalog"

export default async function PackagesCatalogPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const locale = await getCurrentLocale()
  const { facilities, initialFilters, localeMaxPrice, packagesResult, searchBarCountries, searchParamsKey } =
    await getPublicCatalogData(resolvedSearchParams, locale)

  const stickyCopy = {
    id: {
      summary: "Cari dan filter paket dengan cepat",
      cta: "Jelajahi paket",
    },
    en: {
      summary: "Search and filter packages quickly",
      cta: "Browse packages",
    },
    zh: {
      summary: "å¿«é€Ÿæœç´¢å¹¶ç­›é€‰å¥—é¤",
      cta: "æµè§ˆå¥—é¤",
    },
  }[locale]

  return (
    <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#f6fbff_0%,#f9fbff_16%,#fffdfa_48%,#f3f6fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="default" />
      <PackagesCatalogInteractiveClient
        countries={searchBarCountries}
        facilities={facilities}
        initialFilters={initialFilters}
        locale={locale}
        maxAvailablePrice={localeMaxPrice}
        packages={packagesResult.items}
        searchKey={searchParamsKey}
        totalPackages={packagesResult.total}
      />
      <PublicStickyAction locale={locale} href="#top" label={stickyCopy.cta} summary={stickyCopy.summary} />
      <PublicMobileNav locale={locale} />
    </div>
  )
}
