"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useReportWebVitals } from "next/web-vitals"

type PerformancePayload = {
  type: "web-vital" | "navigation"
  name: string
  value: number
  path: string
  id?: string
  rating?: string
}

function sendMetric(payload: PerformancePayload) {
  const body = JSON.stringify(payload)

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/web-vitals", body)
    return
  }

  void fetch("/api/web-vitals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  })
}

export default function PublicPerformanceTracker() {
  const pathname = usePathname()

  useReportWebVitals((metric) => {
    sendMetric({
      type: "web-vital",
      name: metric.name,
      value: metric.value,
      path: pathname,
      id: metric.id,
      rating: metric.rating,
    })
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
    if (!navigationEntry) return

    sendMetric({
      type: "navigation",
      name: "TTFB",
      value: Math.round(navigationEntry.responseStart),
      path: pathname,
    })

    sendMetric({
      type: "navigation",
      name: "DOMContentLoaded",
      value: Math.round(navigationEntry.domContentLoadedEventEnd),
      path: pathname,
    })
  }, [pathname])

  return null
}
