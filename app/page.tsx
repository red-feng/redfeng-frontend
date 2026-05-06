import PublicMobileNav from "@/app/components/PublicMobileNav"
import HomeDestinationsSection from "@/app/components/home/HomeDestinationsSection"
import HomeFooter from "@/app/components/home/HomeFooter"
import HomeInspirationSection from "@/app/components/home/HomeInspirationSection"
import HomeNewsletterSection from "@/app/components/home/HomeNewsletterSection"
import HomeHeroSection from "@/app/components/home/HomeHeroSection"
import { AppHomeFeedSection } from "@/app/components/home/mobile-app"
import HomeTrustSection from "@/app/components/home/HomeTrustSection"
import HomeWhyChooseSection from "@/app/components/home/HomeWhyChooseSection"
import { WebHomePopularSection, WebHomePromoSection, WebHomeServicesSection } from "@/app/components/home/web"
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
