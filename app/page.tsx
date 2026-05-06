import PublicMobileNav from "@/app/components/PublicMobileNav"
import HomeDestinationsSection from "@/app/components/home/HomeDestinationsSection"
import HomeFooter from "@/app/components/home/HomeFooter"
import HomeHeroSection from "@/app/components/home/HomeHeroSection"
import HomeInspirationSection from "@/app/components/home/HomeInspirationSection"
import HomeNewsletterSection from "@/app/components/home/HomeNewsletterSection"
import AppHomeFeedSection from "@/app/components/home/mobile-app/AppHomeFeedSection"
import HomeTrustSection from "@/app/components/home/HomeTrustSection"
import HomeWhyChooseSection from "@/app/components/home/HomeWhyChooseSection"
import WebHomePopularSection from "@/app/components/home/web/WebHomePopularSection"
import WebHomePromoSection from "@/app/components/home/web/WebHomePromoSection"
import WebHomeServicesSection from "@/app/components/home/web/WebHomeServicesSection"
import { getCurrentLocale } from "@/lib/locale"

export default async function HomePage() {
  const locale = await getCurrentLocale()

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="pb-28 md:pb-0">
        <HomeHeroSection />
        <WebHomeServicesSection />
        <AppHomeFeedSection />
        <WebHomePromoSection />
        <WebHomePopularSection />
        <HomeDestinationsSection />
        <HomeInspirationSection />
        <HomeTrustSection />
        <HomeWhyChooseSection />
        <HomeNewsletterSection />
        <HomeFooter />
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}
