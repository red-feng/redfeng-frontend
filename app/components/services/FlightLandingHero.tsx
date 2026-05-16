"use client"

import Image from "next/image"
import { useState } from "react"
import type { Locale } from "@/lib/i18n"
import {
  buildFormFields,
  getLocalizedOptionLabels,
  updateFieldState,
} from "@/app/components/home/web/WebHomeHeroSection"
import {
  getHeroSearchConfig,
  heroSearchConfigs,
  HeroBenefits,
  HeroSearchDesktop,
  HeroSearchMobile,
} from "@/app/components/home/web/hero"

type FlightLandingHeroProps = {
  locale: Locale
}

export default function FlightLandingHero({ locale }: FlightLandingHeroProps) {
  const [activeOption, setActiveOption] = useState("round_trip")
  const [fieldStates, setFieldStates] = useState<Record<string, { label: string; value: string; sublabel?: string }>>({})
  const baseConfig = getHeroSearchConfig("flight", activeOption)
  const stateKey = `flight:${activeOption}`
  const desktopFields = buildFormFields(baseConfig.desktopFields, "flight", stateKey, fieldStates, locale)
  const mobileFields = buildFormFields(baseConfig.mobileFields, "flight", stateKey, fieldStates, locale)
  const config = {
    ...baseConfig,
    ctaHref: "#promo-rute",
    ctaLabel:
      locale === "en"
        ? "See Flight Deals"
        : locale === "zh"
          ? "查看机票优惠"
          : "Lihat Promo Penerbangan",
    desktopFields,
    mobileFields,
  }
  const optionLabels = getLocalizedOptionLabels(locale)
  const copy = {
    id: {
      eyebrow: "Flight Booking",
      title: "Terbang lebih tenang dengan landing page pesawat yang satu keluarga dengan homepage RedFeng.",
      body:
        "Gunakan pola pencarian, ritme visual, dan bahasa promo yang sama seperti homepage utama, sambil menjaga konteks khusus untuk rute penerbangan favorit Anda.",
      pulseLabel: "Flight pulse",
      pulseTitle: "Rute populer siap dibuka",
      pulseBody: "Fase ini memusatkan pencarian, promo rute, dan arahan ke inventory live berikutnya tanpa terasa seperti halaman transisi.",
    },
    en: {
      eyebrow: "Flight Booking",
      title: "Fly with a flight landing page that feels like a natural extension of the RedFeng homepage.",
      body:
        "Keep the same search rhythm, promo language, and visual system from the main homepage while giving flights their own focused travel context.",
      pulseLabel: "Flight pulse",
      pulseTitle: "Popular routes are ready to open",
      pulseBody: "This phase brings search, route promos, and the next live inventory direction together without feeling like a placeholder page.",
    },
    zh: {
      eyebrow: "机票预订",
      title: "让机票落地页自然延续 RedFeng 首页的整体体验。",
      body: "继续使用首页一致的搜索节奏、促销语言与视觉系统，同时让机票场景拥有自己的旅行上下文。",
      pulseLabel: "航班概览",
      pulseTitle: "热门航线已准备就绪",
      pulseBody: "当前阶段把搜索、航线优惠与后续 live inventory 方向放在同一个页面里，不再像临时占位页。",
    },
  }[locale]

  return (
    <section className="relative overflow-hidden bg-[#081f42] text-white">
      <div className="absolute inset-0">
        <Image src="/home-assets/hero-bg.png" alt="Flight hero background" fill priority className="object-cover object-center" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,31,66,0.58)_0%,rgba(8,31,66,0.18)_38%,rgba(255,248,242,0)_100%)]" />
      <div className="absolute inset-y-0 right-0 hidden w-[46%] lg:block">
        <div className="absolute inset-y-[14%] right-[-4%] w-full">
          <Image
            src="/home-assets/promo-flight.png"
            alt="Promo flight visual"
            fill
            priority
            className="object-contain object-right"
          />
        </div>
      </div>

      <div className="relative mx-auto max-w-[1280px] px-4 pb-10 pt-28 sm:px-6 sm:pb-12 lg:px-8 lg:pb-14 lg:pt-40">
        <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
          <div className="max-w-[620px]">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
              {copy.eyebrow}
            </span>
            <h1 className="mt-4 text-[30px] font-bold leading-[1.05] tracking-[-0.045em] text-white sm:text-[42px] lg:text-[54px]">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-orange-50/92 sm:text-base sm:leading-8">
              {copy.body}
            </p>
          </div>

          <div className="hidden lg:block">
            <div className="ml-auto max-w-[360px] rounded-[30px] border border-white/18 bg-white/10 p-6 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.32em] text-orange-100/82">{copy.pulseLabel}</p>
              <h2 className="mt-4 text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] text-white">
                {copy.pulseTitle}
              </h2>
              <p className="mt-4 text-sm leading-7 text-orange-50/88">{copy.pulseBody}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[32px] border border-[#edf1f5] bg-white shadow-[0_28px_60px_-34px_rgba(15,23,42,0.28)]">
          <div className="flex gap-2 overflow-x-auto border-b border-[#edf1f5] px-5 py-4 text-sm font-medium text-slate-700 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:gap-8 lg:px-8 lg:py-[1.65rem]">
            {heroSearchConfigs.flight.options.map((option) => {
              const isActive = option.key === activeOption
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setActiveOption(option.key)}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[12px] transition lg:border-b-[2px] lg:rounded-none lg:border-x-0 lg:border-t-0 lg:px-0 lg:py-[0.7rem] lg:text-[14px] ${
                    isActive
                      ? "border-[#ef3b2d] bg-[#fff4f1] text-[#ef3b2d] lg:bg-transparent"
                      : "border-transparent bg-transparent text-[#53657e] hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {optionLabels[option.key] ?? option.label}
                </button>
              )
            })}
          </div>

          <div className="relative overflow-visible px-5 py-5 lg:px-8 lg:py-[1.65rem]">
            <HeroSearchMobile
              config={config}
              fields={mobileFields}
              locale={locale}
              onSwap={() => {
                const firstField = baseConfig.mobileFields[0]
                const secondField = baseConfig.mobileFields[1]
                if (!firstField || !secondField) return
                setFieldStates((current) => updateFieldState(updateFieldState(current, stateKey, "flight", firstField, secondField.value), stateKey, "flight", secondField, firstField.value))
              }}
              onFieldChange={(index, value) =>
                setFieldStates((current) => updateFieldState(current, stateKey, "flight", mobileFields[index], value))
              }
            />
            <HeroSearchDesktop
              config={config}
              fields={desktopFields}
              locale={locale}
              onSwap={() => {
                const firstField = baseConfig.desktopFields[0]
                const secondField = baseConfig.desktopFields[1]
                if (!firstField || !secondField) return
                setFieldStates((current) => updateFieldState(updateFieldState(current, stateKey, "flight", firstField, secondField.value), stateKey, "flight", secondField, firstField.value))
              }}
              onFieldChange={(index, value) =>
                setFieldStates((current) => updateFieldState(current, stateKey, "flight", desktopFields[index], value))
              }
            />
            <HeroBenefits activeTab="flight" locale={locale} />
          </div>
        </div>
      </div>
    </section>
  )
}
