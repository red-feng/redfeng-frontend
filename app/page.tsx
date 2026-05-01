import PublicMobileNav from "@/app/components/PublicMobileNav"
import HomeFooter from "@/app/components/home/HomeFooter"
import HomeHeroSection from "@/app/components/home/HomeHeroSection"
import {
  HomeDestinationsSection,
  HomeNewsletterSection,
  HomePopularSection,
  HomePromoSection,
  HomeServicesSection,
  HomeTrustSection,
  HomeWhyChooseSection,
} from "@/app/components/home/HomePageSections"
import { getCurrentLocale } from "@/lib/locale"

export default async function HomePage() {
  const locale = await getCurrentLocale()

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="pb-28 md:pb-0">
        <HomeHeroSection />
        <HomeServicesSection />
        <HomePromoSection />
        <HomePopularSection />
        <HomeDestinationsSection />
        <HomeTrustSection />
        <HomeWhyChooseSection />
        <HomeNewsletterSection />
        <HomeFooter />
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}
