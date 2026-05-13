import MarketingTeamAccountsPage from "@/app/marketing/(protected)/team-accounts/page"

export default async function SuperadminMarketingTeamAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  return MarketingTeamAccountsPage({ searchParams, portal: "superadmin" })
}
