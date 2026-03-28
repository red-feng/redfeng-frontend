import { redirect } from "next/navigation"

export default async function SuperadminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  await searchParams
  redirect("/superadmin/superadmin-accounts")
}
