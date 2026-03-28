import FinanceDashboardPage from "@/app/finance/(protected)/dashboard/page"

export default async function SuperadminFinanceManagerPreviewPage() {
  return FinanceDashboardPage({
    searchParams: Promise.resolve({ view: "finance-manager" }),
  })
}
