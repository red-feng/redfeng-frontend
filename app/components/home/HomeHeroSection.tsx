import AppHomeTopSection from "@/app/components/home/mobile-app/AppHomeTopSection"
import WebHomeHeroSection from "@/app/components/home/web/WebHomeHeroSection"

export default function HomeHeroSection() {
  return (
    <section className="home-hero">
      <div className="home-hero-surface overflow-hidden bg-[linear-gradient(115deg,#fffaf7_0%,#fffefc_36%,#f9fbfe_100%)] shadow-[0_18px_36px_-34px_rgba(15,23,42,0.08)]">
        <AppHomeTopSection />
        <WebHomeHeroSection />
      </div>
    </section>
  )
}
