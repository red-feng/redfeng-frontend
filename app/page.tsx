import PublicMobileNav from "@/app/components/PublicMobileNav"
import HomeDestinationsSection from "@/app/components/home/HomeDestinationsSection"
import HomeFooter from "@/app/components/home/HomeFooter"
import HomeHeroSection from "@/app/components/home/HomeHeroSection"
import HomeNewsletterSection from "@/app/components/home/HomeNewsletterSection"
import HomePopularSection from "@/app/components/home/HomePopularSection"
import HomePromoSection from "@/app/components/home/HomePromoSection"
import HomeServicesSection from "@/app/components/home/HomeServicesSection"
import HomeTrustSection from "@/app/components/home/HomeTrustSection"
import HomeWhyChooseSection from "@/app/components/home/HomeWhyChooseSection"
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
