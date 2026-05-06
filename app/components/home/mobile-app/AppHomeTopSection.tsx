import AppHomeHeader from "@/app/components/home/mobile-app/AppHomeHeader"
import AppHomeServiceHub from "@/app/components/home/mobile-app/AppHomeServiceHub"

export default function AppHomeTopSection() {
  return (
    <section className="standalone-home-top relative md:hidden">
      <AppHomeHeader />
      <AppHomeServiceHub />
    </section>
  )
}
