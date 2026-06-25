import SupplierBalancesPage from "@/app/finance/(protected)/supplier-balances/page"

export default async function SuperadminSupplierBalancesPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; result?: string }>
}) {
  return SupplierBalancesPage({ searchParams, portal: "superadmin" })
}
