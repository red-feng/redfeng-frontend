"use client"

import { createClient } from "@/lib/supabase/client"

export const FAVORITES_STORAGE_KEY = "redfeng:favorites"

export type FavoriteEntry = {
  key: string
  title: string
  subtitle?: string
  href: string
  meta?: string
}

export function readFavorites() {
  if (typeof window === "undefined") return [] as FavoriteEntry[]

  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as FavoriteEntry[]) : []
  } catch {
    return []
  }
}

export function writeFavorites(items: FavoriteEntry[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent("redfeng:favorites-changed"))
}

export function mergeFavoritesFromAccount(accountItems: FavoriteEntry[]) {
  const localItems = readFavorites()
  const mergedMap = new Map<string, FavoriteEntry>()

  for (const item of [...accountItems, ...localItems]) {
    mergedMap.set(item.key, item)
  }

  const merged = [...mergedMap.values()]
  writeFavorites(merged)
  return merged
}

export async function persistFavoritesToAccount(items: FavoriteEntry[]) {
  return persistFavoritesToAccountNow(items)
}

export async function persistFavoritesToAccountNow(items: FavoriteEntry[]) {
  const supabase = createClient("customer")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false as const, storageMode: "guest" as const }

  try {
    const response = await fetch("/api/customer/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        favorites: items,
        notifications: undefined,
      }),
    })

    if (!response.ok) return { ok: false as const, storageMode: "error" as const }

    const data = (await response.json()) as { storageMode?: "account" | "local_only" }

    return {
      ok: true as const,
      storageMode: data.storageMode || "local_only",
    }
  } catch {}

  return { ok: false as const, storageMode: "error" as const }
}

export function toggleFavorite(item: FavoriteEntry) {
  const current = readFavorites()
  const exists = current.some((entry) => entry.key === item.key)
  const next = exists ? current.filter((entry) => entry.key !== item.key) : [item, ...current]
  writeFavorites(next)
  void persistFavoritesToAccountNow(next)
  return !exists
}

export function isFavorite(key: string) {
  return readFavorites().some((entry) => entry.key === key)
}
