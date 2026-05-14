export const marketingPromoStatuses = ["draft", "scheduled", "active", "paused"] as const

export type MarketingPromoStatus = (typeof marketingPromoStatuses)[number]
export const marketingPromoEffectiveStates = ["live", "waiting", "expired", "hidden"] as const
export type MarketingPromoEffectiveState = (typeof marketingPromoEffectiveStates)[number]

export function isMarketingPromoStatus(value: string): value is MarketingPromoStatus {
  return marketingPromoStatuses.includes(value as MarketingPromoStatus)
}

export function getMarketingPromoStatusLabel(value: string) {
  switch (value) {
    case "draft":
      return "Draft"
    case "scheduled":
      return "Scheduled"
    case "active":
      return "Active"
    case "paused":
      return "Paused"
    default:
      return value
  }
}

export function shouldPromoBeIndexable(status: MarketingPromoStatus) {
  return status === "active" || status === "scheduled"
}

export function getMarketingPromoEffectiveState(input: {
  is_active: boolean | null | undefined
  status: string | null | undefined
  starts_at: string | null | undefined
  ends_at: string | null | undefined
}, nowIso: string = new Date().toISOString()): MarketingPromoEffectiveState {
  if (!input.is_active) return "hidden"
  if (input.status === "draft" || input.status === "paused") return "hidden"

  const now = new Date(nowIso).getTime()
  const startsAt = input.starts_at ? new Date(input.starts_at).getTime() : null
  const endsAt = input.ends_at ? new Date(input.ends_at).getTime() : null

  if (endsAt !== null && Number.isFinite(endsAt) && endsAt < now) return "expired"
  if (startsAt !== null && Number.isFinite(startsAt) && startsAt > now) return "waiting"
  if (input.status === "scheduled" && startsAt === null) return "hidden"

  return "live"
}

export function getMarketingPromoEffectiveStateLabel(value: MarketingPromoEffectiveState) {
  switch (value) {
    case "live":
      return "Live"
    case "waiting":
      return "Waiting"
    case "expired":
      return "Expired"
    case "hidden":
      return "Hidden"
    default:
      return value
  }
}
