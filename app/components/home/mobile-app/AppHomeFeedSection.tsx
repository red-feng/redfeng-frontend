import AppHomePromoSection from "@/app/components/home/mobile-app/AppHomePromoSection"
import AppHomeRecentActivitySection from "@/app/components/home/mobile-app/AppHomeRecentActivitySection"

export default function AppHomeFeedSection() {
  return (
    <section className="standalone-home-feed hidden px-4 pb-4 md:hidden">
      <AppHomePromoSection />
      <AppHomeRecentActivitySection />
    </section>
  )
}
