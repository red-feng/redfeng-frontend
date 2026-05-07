export type FavoritePreferenceItem = {
  key: string
  title: string
  subtitle?: string
  href: string
  meta?: string
}

export type NotificationPreferenceItem = {
  id: string
  title: string
  body: string
  href: string
  tag: string
  read?: boolean
}

export function normalizeFavoriteItems(input: unknown): FavoritePreferenceItem[] {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const record = item as Record<string, unknown>
      const key = String(record.key || "").trim()
      const title = String(record.title || "").trim()
      const href = String(record.href || "").trim()
      if (!key || !title || !href) return null

      return {
        key,
        title,
        subtitle: String(record.subtitle || "").trim() || undefined,
        href,
        meta: String(record.meta || "").trim() || undefined,
      }
    })
    .filter((item): item is FavoritePreferenceItem => Boolean(item))
}

export function normalizeNotificationItems(input: unknown): NotificationPreferenceItem[] {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const record = item as Record<string, unknown>
      const id = String(record.id || "").trim()
      const title = String(record.title || "").trim()
      const body = String(record.body || "").trim()
      const href = String(record.href || "").trim()
      const tag = String(record.tag || "").trim()
      if (!id || !title || !body || !href || !tag) return null

      return {
        id,
        title,
        body,
        href,
        tag,
        read: Boolean(record.read),
      }
    })
    .filter((item): item is NotificationPreferenceItem => Boolean(item))
}
