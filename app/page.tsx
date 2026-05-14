import PublicMobileNav from "@/app/components/PublicMobileNav"
import HomeHeroSection from "@/app/components/home/HomeHeroSection"
import { AppHomeFeedSection, AppHomeFooterSection } from "@/app/components/home/mobile-app"
import PromoPlacementImpressionBeacon from "@/app/components/promo/PromoPlacementImpressionBeacon"
import {
  HomeDestinationsSection,
  HomeFooter,
  HomeInspirationSection,
  HomeNewsletterSection,
  HomeTrustSection,
  HomeWhyChooseSection,
} from "@/app/components/home/shared/sections"
import { WebHomePopularSection, WebHomePromoSection, WebHomeServicesSection } from "@/app/components/home/web"
import { getCurrentLocale } from "@/lib/locale"
import { getMarketingInspirationArticles, getMarketingPromos } from "@/lib/marketing-content"

type HomePageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const locale = await getCurrentLocale()
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const [promos, inspirationArticles] = await Promise.all([
    getMarketingPromos(locale, { placement: "homepage_feed" }),
    getMarketingInspirationArticles(locale),
  ])

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="pb-28 md:pb-0">
        <HomeHeroSection locale={locale} />
        <WebHomeServicesSection locale={locale} />
        <PromoPlacementImpressionBeacon placement="homepage_feed" sourcePath="/" promos={promos.map((promo) => ({ id: promo.id, slug: promo.slug }))} />
        <AppHomeFeedSection locale={locale} promos={promos} />
        <WebHomePromoSection locale={locale} promos={promos} />
        <WebHomePopularSection locale={locale} />
        <HomeDestinationsSection locale={locale} />
        <HomeInspirationSection locale={locale} articles={inspirationArticles} />
        <AppHomeFooterSection />
        <HomeTrustSection locale={locale} />
        <HomeWhyChooseSection locale={locale} />
        <HomeNewsletterSection
          locale={locale}
          redirectPath="/"
          successMessage={resolvedSearchParams.newsletter_success}
          errorMessage={resolvedSearchParams.newsletter_error}
        />
        <HomeFooter locale={locale} />
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}
