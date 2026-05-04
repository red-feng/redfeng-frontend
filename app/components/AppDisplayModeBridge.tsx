"use client"

import { useEffect } from "react"

function resolveDisplayMode() {
  if (typeof window === "undefined") return "browser"

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))

  return isStandalone ? "standalone" : "browser"
}

export default function AppDisplayModeBridge() {
  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return

    const root = document.documentElement
    const applyMode = () => {
      root.dataset.displayMode = resolveDisplayMode()
    }

    const standaloneQuery = window.matchMedia("(display-mode: standalone)")
    const overlayQuery = window.matchMedia("(display-mode: window-controls-overlay)")

    applyMode()

    standaloneQuery.addEventListener("change", applyMode)
    overlayQuery.addEventListener("change", applyMode)
    window.addEventListener("appinstalled", applyMode)

    return () => {
      standaloneQuery.removeEventListener("change", applyMode)
      overlayQuery.removeEventListener("change", applyMode)
      window.removeEventListener("appinstalled", applyMode)
    }
  }, [])

  return null
}
