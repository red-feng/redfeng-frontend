import PublicMobileNav from "@/app/components/PublicMobileNav"
import HomeHeroSection from "@/app/components/home/HomeHeroSection"
import { AppHomeFeedSection, AppHomeFooterSection } from "@/app/components/home/mobile-app"
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
        <AppHomeFooterSection />
        <HomeTrustSection />
        <HomeWhyChooseSection />
        <HomeNewsletterSection />
        <HomeFooter />
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}
