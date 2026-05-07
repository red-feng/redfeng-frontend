import AppHomePopularSection from "@/app/components/home/mobile-app/AppHomePopularSection"
import AppHomePromoSection from "@/app/components/home/mobile-app/AppHomePromoSection"
import AppHomeRecentActivitySection from "@/app/components/home/mobile-app/AppHomeRecentActivitySection"

export default function AppHomeFeedSection() {
  return (
    <section className="standalone-home-feed hidden px-4 pb-4 pt-3 md:hidden">
      <AppHomePromoSection />
      <AppHomeRecentActivitySection />
      <AppHomePopularSection />
    </section>
  )
}
