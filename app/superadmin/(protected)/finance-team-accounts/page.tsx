import FinanceTeamAccountsPage from "@/app/finance/(protected)/team-accounts/page"

export default async function SuperadminFinanceTeamAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  return FinanceTeamAccountsPage({ searchParams })
}
