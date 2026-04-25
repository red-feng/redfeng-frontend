"use client"

import { useEffect } from "react"

export default function AdminDashboardHeightSync() {
  useEffect(() => {
    const syncHeights = () => {
      const shouldSync = window.matchMedia("(min-width: 1280px)").matches
      const source = document.querySelector<HTMLElement>("[data-dashboard-height-source='category']")
      const targets = Array.from(
        document.querySelectorAll<HTMLElement>("[data-dashboard-height-target='category']"),
      )

      if (!source || targets.length === 0) return

      if (!shouldSync) {
        targets.forEach((target) => {
          target.style.height = ""
        })
        return
      }

      const height = source.getBoundingClientRect().height
      targets.forEach((target) => {
        const syncMode = target.dataset.dashboardHeightMode || "always"
        const isActive = target.dataset.dashboardHeightActive !== "false"
        target.style.height = syncMode === "when-active" && !isActive ? "" : `${Math.ceil(height)}px`
      })
    }

    syncHeights()

    const source = document.querySelector<HTMLElement>("[data-dashboard-height-source='category']")
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && source
        ? new ResizeObserver(() => {
            syncHeights()
          })
        : null

    if (source && resizeObserver) {
      resizeObserver.observe(source)
    }

    window.addEventListener("resize", syncHeights)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener("resize", syncHeights)
    }
  }, [])

  return null
}
