import PublicHeader from "@/app/components/PublicHeader"
import { AppHomeTopSection } from "@/app/components/home/mobile-app"
import { WebHomeHeroSection } from "@/app/components/home/web"
import type { Locale } from "@/lib/i18n"

export default function HomeHeroSection({ locale }: { locale: Locale }) {
  return (
    <section className="home-hero">
      <div className="home-hero-surface overflow-hidden bg-[linear-gradient(115deg,#fffaf7_0%,#fffefc_36%,#f9fbfe_100%)] shadow-[0_18px_36px_-34px_rgba(15,23,42,0.08)]">
        <div className="md:hidden">
          <AppHomeTopSection />
        </div>
        <div className="hidden md:block">
          <PublicHeader locale={locale} redirectSuperadminFromHome />
          <WebHomeHeroSection />
        </div>
      </div>
    </section>
  )
}
