import FinanceAdminUsersPage from "@/app/finance/(protected)/admin-users/page"

export default async function SuperadminFinanceTeamAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  return FinanceAdminUsersPage({ searchParams })
}
