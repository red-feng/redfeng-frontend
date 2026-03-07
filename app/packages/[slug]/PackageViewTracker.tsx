"use client"

import { useEffect } from "react"

export default function PackageViewTracker({ packageId }: { packageId: string }) {
  useEffect(() => {
    const storageKey = "rf_package_view_session_id"
    let sessionId = window.localStorage.getItem(storageKey)

    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      window.localStorage.setItem(storageKey, sessionId)
    }

    void fetch("/api/package-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package_id: packageId,
        session_id: sessionId,
      }),
    })
  }, [packageId])

  return null
}
