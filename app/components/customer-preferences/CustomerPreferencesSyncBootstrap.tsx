"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  mergeFavoritesFromAccount,
  persistFavoritesToAccountNow,
  readFavorites,
} from "@/app/components/favorites/favoritesStore"
import {
  mergeNotificationsFromAccount,
  persistNotificationsToAccountNow,
  type NotificationEntry,
} from "@/app/components/notifications/notificationsStore"

type CustomerPreferencesSyncBootstrapProps = {
  notificationDefaults: NotificationEntry[]
}

export default function CustomerPreferencesSyncBootstrap({
  notificationDefaults,
}: CustomerPreferencesSyncBootstrapProps) {
  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      const supabase = createClient("customer")
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || cancelled) return

      const response = await fetch("/api/customer/preferences", { cache: "no-store" })
      if (!response.ok || cancelled) return

      const data = (await response.json()) as {
        favorites?: ReturnType<typeof readFavorites>
        notifications?: NotificationEntry[]
        storageMode?: "account" | "local_only"
      }

      if (data.storageMode === "local_only") return

      const mergedFavorites = mergeFavoritesFromAccount(data.favorites || [])
      const mergedNotifications = mergeNotificationsFromAccount(data.notifications || [], notificationDefaults)

      await persistFavoritesToAccountNow(mergedFavorites)
      await persistNotificationsToAccountNow(mergedNotifications)
    }

    void sync()
    return () => {
      cancelled = true
    }
  }, [notificationDefaults])

  return null
}
