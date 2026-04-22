import FinancePayoutsPage from "@/app/finance/(protected)/payouts/page"

export default async function SuperadminFinancePayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  return FinancePayoutsPage({ searchParams, portal: "superadmin" })
}
