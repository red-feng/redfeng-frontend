import FinanceRefundsPage from "@/app/finance/(protected)/refunds/page"

export default async function SuperadminFinanceRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; filter?: string }>
}) {
  return FinanceRefundsPage({ searchParams, portal: "superadmin" })
}
