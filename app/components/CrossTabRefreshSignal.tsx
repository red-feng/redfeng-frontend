"use client"

import { useEffect } from "react"

type CrossTabRefreshSignalProps = {
  storageKey: string
  value: string
}

export default function CrossTabRefreshSignal({
  storageKey,
  value,
}: CrossTabRefreshSignalProps) {
  useEffect(() => {
    if (!value) return

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          value,
          at: Date.now(),
        }),
      )
    } catch (error) {
      console.error("Cross-tab refresh signal error:", error)
    }
  }, [storageKey, value])

  return null
}
