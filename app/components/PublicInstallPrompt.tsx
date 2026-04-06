"use client"

import { useEffect, useState } from "react"
import { type Locale } from "@/lib/i18n"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

const storageKey = "rf_install_prompt_dismissed"

export default function PublicInstallPrompt({ locale }: { locale: Locale }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const copy = {
    id: {
      title: "Pasang Red Feng di layar utama",
      body: "Buka lebih cepat seperti aplikasi dan lanjut jelajahi paket tanpa ribet.",
      install: "Pasang",
      dismiss: "Nanti",
    },
    en: {
      title: "Install Red Feng on your home screen",
      body: "Open it faster like an app and continue browsing packages more smoothly.",
      install: "Install",
      dismiss: "Later",
    },
    zh: {
      title: "将 Red Feng 添加到主屏幕",
      body: "像应用一样更快打开，继续更顺畅地浏览套餐。",
      install: "安装",
      dismiss: "稍后",
    },
  }[locale]

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.localStorage.getItem(storageKey) === "1") return

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
  }, [])

  const dismissPrompt = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, "1")
    }
    setIsVisible(false)
  }

  const installApp = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === "accepted") {
      dismissPrompt()
      return
    }
    setIsVisible(false)
  }

  if (!isVisible || !deferredPrompt) return null

  return (
    <div className="fixed inset-x-0 top-3 z-[85] px-4 md:top-4">
      <div className="mx-auto flex max-w-xl items-start gap-3 rounded-[26px] border border-orange-100 bg-[linear-gradient(135deg,#fffaf4_0%,#ffffff_55%,#fff2e3_100%)] p-4 shadow-[0_28px_60px_-34px_rgba(249,115,22,0.45)] backdrop-blur">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-orange-500 text-white shadow-[0_16px_32px_-18px_rgba(249,115,22,0.72)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
            <path d="M12 3v11" />
            <path d="M8.5 7 12 3l3.5 4" />
            <path d="M5 14.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-950">{copy.title}</p>
          <p className="mt-1 text-xs leading-6 text-slate-600">{copy.body}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={installApp}
              className="rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              {copy.install}
            </button>
            <button
              type="button"
              onClick={dismissPrompt}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {copy.dismiss}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
