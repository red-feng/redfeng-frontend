export const FINANCE_NAV_SEEN_SECTIONS = ["refunds", "payouts"] as const

export type FinanceNavSeenSection = (typeof FINANCE_NAV_SEEN_SECTIONS)[number]

export const FINANCE_NAV_SECTION_TO_COLUMN: Record<FinanceNavSeenSection, string> = {
  refunds: "seen_refunds_at",
  payouts: "seen_payouts_at",
}

export const FINANCE_NAV_ROUTE_SECTION_MAP: Array<{ prefix: string; section: FinanceNavSeenSection }> = [
  { prefix: "/finance/refunds", section: "refunds" },
  { prefix: "/finance/payouts", section: "payouts" },
]

export function isFinanceNavSeenSection(value: string): value is FinanceNavSeenSection {
  return FINANCE_NAV_SEEN_SECTIONS.includes(value as FinanceNavSeenSection)
}
