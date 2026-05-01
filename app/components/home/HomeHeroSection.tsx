import Image from "next/image"
import HeroBenefits from "@/app/components/home/HeroBenefits"
import HeroHeader from "@/app/components/home/HeroHeader"
import HeroSearchDesktop from "@/app/components/home/HeroSearchDesktop"
import HeroSearchMobile from "@/app/components/home/HeroSearchMobile"
import HeroTabs from "@/app/components/home/HeroTabs"

export default function HomeHeroSection() {
  return (
    <section>
      <div className="overflow-hidden bg-[linear-gradient(115deg,#fffaf7_0%,#fffefc_36%,#f9fbfe_100%)] shadow-[0_18px_36px_-34px_rgba(15,23,42,0.08)]">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,194,155,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(148,197,255,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.05)_100%)]" />
          <DesktopHeroBackdrop />

          <div className="relative mx-auto max-w-[1240px] px-5 pb-16 pt-5 sm:px-6 lg:px-8">
            <HeroHeader />
            <MobileHeroBackdrop />
            <HeroIntro />
          </div>
        </div>

        <div className="relative z-20 mx-auto -mt-36 max-w-[1240px] px-4 pb-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[30px] border border-white/90 bg-white shadow-[0_16px_30px_-28px_rgba(15,23,42,0.08)]">
            <HeroTabs />
            <HeroSearchPanel />
          </div>
        </div>
      </div>
    </section>
  )
}

function DesktopHeroBackdrop() {
  return (
    <div className="absolute inset-0 hidden lg:block">
      <Image src="/home-assets/hero-bg.png" alt="Hero RedFeng" fill priority className="object-cover object-center" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,250,245,0.96)_0%,rgba(255,250,245,0.88)_16%,rgba(255,250,245,0.56)_30%,rgba(255,250,245,0.18)_46%,rgba(255,255,255,0.03)_62%,rgba(255,255,255,0)_76%),linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.02)_100%)]" />
    </div>
  )
}

function MobileHeroBackdrop() {
  return (
    <div className="absolute inset-0 lg:hidden">
      <Image src="/home-assets/hero-bg.png" alt="Hero RedFeng" fill priority className="object-cover object-[66%_center]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.88)_38%,rgba(255,255,255,0.2)_72%,rgba(255,255,255,0.02)_100%),linear-gradient(180deg,rgba(255,252,247,0.65)_0%,rgba(255,252,247,0.12)_100%)]" />
    </div>
  )
}

function HeroIntro() {
  return (
    <div className="relative z-10 pt-8 lg:pt-12">
      <div className="max-w-[520px] pb-44 lg:min-h-[430px] lg:pb-0">
        <h1 className="text-[28px] font-black leading-[1.08] tracking-[-0.05em] text-slate-950 sm:text-[48px] lg:text-[60px]">
          Semua kebutuhan
          <span className="block">perjalanan Anda,</span>
          <span className="mt-1 block text-[#ff5a43]">dalam satu platform</span>
        </h1>
        <p className="mt-4 max-w-[330px] text-[15px] leading-8 text-slate-700 sm:text-[16px] sm:leading-8">
          Pesawat, hotel, kereta, bus, kapal, aktivitas, dan paket wisata terbaik untuk Anda.
        </p>
      </div>
    </div>
  )
}

function HeroSearchPanel() {
  return (
    <div className="px-4 py-5 lg:px-6 lg:py-6">
      <div className="hidden flex-wrap gap-6 text-[13px] text-slate-600 lg:flex">
        <label className="inline-flex items-center gap-2 font-medium text-slate-800">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5a43]" />
          Sekali Jalan
        </label>
        <label className="inline-flex items-center gap-2 font-medium">
          <span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" />
          Pulang - Pergi
        </label>
        <label className="inline-flex items-center gap-2 font-medium">
          <span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" />
          Multi Kota
        </label>
      </div>

      <HeroSearchMobile />
      <HeroSearchDesktop />
      <HeroBenefits />
    </div>
  )
}
