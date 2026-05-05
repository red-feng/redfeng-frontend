"use client"

import Image from "next/image"
import { useState } from "react"
import HeroBenefits from "@/app/components/home/HeroBenefits"
import HeroHeader from "@/app/components/home/HeroHeader"
import HeroSearchDesktop from "@/app/components/home/HeroSearchDesktop"
import HeroSearchMobile from "@/app/components/home/HeroSearchMobile"
import HeroTabs from "@/app/components/home/HeroTabs"
import { heroSearchConfigs } from "@/app/components/home/heroSearchContent"
import type { HeroTabKey } from "@/app/components/home/homeContent"

export default function HomeHeroSection() {
  const [activeTab, setActiveTab] = useState<HeroTabKey>("flight")

  return (
    <section className="home-hero">
      <div className="home-hero-surface overflow-hidden bg-[linear-gradient(115deg,#fffaf7_0%,#fffefc_36%,#f9fbfe_100%)] shadow-[0_18px_36px_-34px_rgba(15,23,42,0.08)]">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,194,155,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(148,197,255,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.05)_100%)]" />
          <DesktopHeroBackdrop />

          <div className="home-hero-shell relative mx-auto max-w-[1240px] px-5 pb-12 pt-5 sm:px-6 lg:px-8">
            <HeroHeader />
            <MobileHeroBackdrop />
            <HeroIntro />
          </div>
        </div>

        <div className="home-hero-search-wrap relative z-20 mx-auto -mt-28 max-w-[1240px] px-4 pb-10 sm:-mt-36 sm:px-6 lg:-mt-56 lg:pb-14 lg:px-8">
          <div className="home-hero-search-card overflow-hidden rounded-[30px] border border-white/90 bg-white shadow-[0_22px_44px_-30px_rgba(15,23,42,0.14)]">
            <HeroTabs activeTab={activeTab} onChange={setActiveTab} />
            <HeroSearchPanel activeTab={activeTab} />
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
      <Image src="/home-assets/hero-bg.png" alt="Hero RedFeng" fill priority className="object-cover object-[72%_center]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.97)_0%,rgba(255,255,255,0.9)_36%,rgba(255,255,255,0.18)_72%,rgba(255,255,255,0.02)_100%),linear-gradient(180deg,rgba(255,252,247,0.52)_0%,rgba(255,252,247,0.1)_100%)]" />
    </div>
  )
}

function HeroIntro() {
  return (
    <div className="home-hero-intro relative z-10 flex justify-center pt-8 text-center lg:pt-12">
      <div className="home-hero-intro-shell max-w-[760px] pb-40 lg:min-h-[430px] lg:pb-0">
        <h1 className="home-hero-title mx-auto max-w-[320px] text-[28px] font-black leading-[1.08] tracking-[-0.05em] text-slate-950 sm:max-w-[620px] sm:text-[48px] lg:max-w-[760px] lg:text-[52px] lg:leading-[1.04]">
          Ekosistem perjalanan
          <span className="mt-1 block text-[#ff5a43]">dalam satu genggaman</span>
        </h1>
      </div>
    </div>
  )
}

function HeroSearchPanel({ activeTab }: { activeTab: HeroTabKey }) {
  const config = heroSearchConfigs[activeTab]

  return (
    <div className="px-4 py-5 lg:px-6 lg:py-7">
      <div className="hidden flex-wrap gap-6 text-[13px] text-slate-600 lg:flex">
        {config.options.map((option) => (
          <label key={option.label} className={`inline-flex items-center gap-2 font-medium ${option.active ? "text-slate-800" : ""}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${option.active ? "bg-[#ff5a43]" : "border border-slate-300 bg-white"}`} />
            {option.label}
          </label>
        ))}
      </div>

      <HeroSearchMobile config={config} />
      <HeroSearchDesktop config={config} />
      <HeroBenefits activeTab={activeTab} />
    </div>
  )
}
