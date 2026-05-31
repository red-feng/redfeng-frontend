import PackageCatalogInteractiveShell from "@/app/packages/catalog/PackageCatalogInteractiveShell"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import { getCurrentLocale } from "@/lib/locale"
import { getPublicCatalogData } from "@/lib/public-package-catalog"

export const dynamic = "force-dynamic"

export default async function PackagesCatalogRoute({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const locale = await getCurrentLocale()
  const { facilities, initialFilters, localeMaxPrice, packagesResult, searchBarCountries, searchParamsKey } =
    await getPublicCatalogData(resolvedSearchParams, locale)

  const selectedCountry = Array.isArray(resolvedSearchParams.country) ? resolvedSearchParams.country[0] || "" : resolvedSearchParams.country || ""
  const selectedStyle = Array.isArray(resolvedSearchParams.style) ? resolvedSearchParams.style[0] || "" : resolvedSearchParams.style || ""
  const selectedDuration = Array.isArray(resolvedSearchParams.duration) ? resolvedSearchParams.duration[0] || "" : resolvedSearchParams.duration || ""

  const copy = {
    id: {
      stickySummary: "Ubah pencarian dan bandingkan paket lebih cepat",
      stickyLabel: "Ubah pencarian",
    },
    en: {
      stickySummary: "Refine your search and compare packages faster",
      stickyLabel: "Refine search",
    },
    zh: {
      stickySummary: "æ›´å¿«è°ƒæ•´æœç´¢å¹¶æ¯”è¾ƒå¥—é¤",
      stickyLabel: "è°ƒæ•´æœç´¢",
    },
  }[locale]

  return (
    <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_22%,#f3f7fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="default" />

      <PackageCatalogInteractiveShell
        facilities={facilities}
        initialFilters={initialFilters}
        locale={locale}
        maxAvailablePrice={localeMaxPrice}
        packages={packagesResult.items}
        searchBarCountries={searchBarCountries}
        searchParamsKey={searchParamsKey}
        stickyLabel={copy.stickyLabel}
        stickySummary={copy.stickySummary}
        totalPackages={packagesResult.total}
        selectedCountry={selectedCountry}
        selectedStyle={selectedStyle}
        selectedDuration={selectedDuration}
      />
    </div>
  )
}
