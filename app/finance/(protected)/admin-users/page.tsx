import { redirect } from "next/navigation"
type SearchParams = Promise<Record<string, string | undefined>>

export default async function FinanceAdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params || {})) {
    if (typeof value === "string" && value) query.set(key, value)
  }
  const suffix = query.toString()
  redirect(suffix ? `/finance/team-accounts?${suffix}` : "/finance/team-accounts")
}
