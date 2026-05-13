import AppHomePopularSection from "@/app/components/home/mobile-app/AppHomePopularSection"
import AppHomePromoSection from "@/app/components/home/mobile-app/AppHomePromoSection"
import AppHomeRecentActivitySection from "@/app/components/home/mobile-app/AppHomeRecentActivitySection"
import type { Locale } from "@/lib/i18n"
import type { MarketingPromo } from "@/lib/marketing-content"

export default function AppHomeFeedSection({ locale, promos }: { locale: Locale; promos: MarketingPromo[] }) {
  return (
    <section className="standalone-home-feed hidden px-4 pb-4 pt-3 md:hidden">
      <AppHomePromoSection locale={locale} promos={promos} />
      <AppHomeRecentActivitySection locale={locale} />
      <AppHomePopularSection locale={locale} />
    </section>
  )
}
