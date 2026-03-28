import AdminTeamAccountsPage from "@/app/admin/(protected)/team-accounts/page"

export default async function SuperadminTeamAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  return AdminTeamAccountsPage({ searchParams })
}
