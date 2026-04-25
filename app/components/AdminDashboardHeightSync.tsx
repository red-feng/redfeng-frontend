"use client"

import { useEffect } from "react"

export default function AdminDashboardHeightSync() {
  useEffect(() => {
    const syncHeights = () => {
      const shouldSync = window.matchMedia("(min-width: 1280px)").matches
      const sources = Array.from(
        document.querySelectorAll<HTMLElement>("[data-dashboard-height-source]"),
      )

      sources.forEach((source) => {
        const group = source.dataset.dashboardHeightSource
        if (!group) return

        const targets = Array.from(
          document.querySelectorAll<HTMLElement>(`[data-dashboard-height-target='${group}']`),
        )

        if (targets.length === 0) return

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
      })
    }

    syncHeights()

    const sources = Array.from(
      document.querySelectorAll<HTMLElement>("[data-dashboard-height-source]"),
    )
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            syncHeights()
          })
        : null

    if (resizeObserver) {
      sources.forEach((source) => {
        resizeObserver.observe(source)
      })
    }

    window.addEventListener("resize", syncHeights)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener("resize", syncHeights)
    }
  }, [])

  return null
}
