import { AppHomeTopSection } from "@/app/components/home/mobile-app"
import { WebHomeHeroSection } from "@/app/components/home/web"

export default function HomeHeroSection() {
  return (
    <section className="home-hero relative z-20 overflow-visible">
      <div className="home-hero-surface overflow-hidden md:overflow-visible bg-[linear-gradient(115deg,#fffaf7_0%,#fffefc_36%,#f9fbfe_100%)] shadow-[0_18px_36px_-34px_rgba(15,23,42,0.08)]">
        <div className="md:hidden">
          <AppHomeTopSection />
        </div>
        <div className="hidden md:block">
          <WebHomeHeroSection />
        </div>
      </div>
    </section>
  )
}
