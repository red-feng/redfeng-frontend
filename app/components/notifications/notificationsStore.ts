"use client"

import { createClient } from "@/lib/supabase/client"

export const NOTIFICATIONS_STORAGE_KEY = "redfeng:notifications"

export type NotificationEntry = {
  id: string
  title: string
  body: string
  href: string
  tag: string
  read?: boolean
}

function normalize(items: NotificationEntry[]) {
  return items.map((item) => ({ ...item, read: Boolean(item.read) }))
}

export function readNotifications(defaultItems: NotificationEntry[]) {
  if (typeof window === "undefined") return normalize(defaultItems)

  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)
    if (!raw) {
      const seeded = normalize(defaultItems)
      window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(seeded))
      return seeded
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return normalize(defaultItems)
    return normalize(parsed as NotificationEntry[])
  } catch {
    return normalize(defaultItems)
  }
}

export function writeNotifications(items: NotificationEntry[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent("redfeng:notifications-changed"))
}

export function mergeNotificationsFromAccount(
  accountItems: NotificationEntry[],
  defaultItems: NotificationEntry[],
) {
  const localItems = readNotifications(defaultItems)
  const mergedMap = new Map<string, NotificationEntry>()

  for (const item of [...defaultItems, ...accountItems, ...localItems]) {
    mergedMap.set(item.id, {
      ...item,
      read: Boolean(item.read),
    })
  }

  const merged = [...mergedMap.values()]
  writeNotifications(merged)
  return merged
}

export async function persistNotificationsToAccount(items: NotificationEntry[]) {
  const supabase = createClient("customer")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  try {
    await fetch("/api/customer/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        favorites: undefined,
        notifications: items,
      }),
    })
  } catch {}
}

export function unreadNotificationCount(defaultItems: NotificationEntry[]) {
  return readNotifications(defaultItems).filter((item) => !item.read).length
}
