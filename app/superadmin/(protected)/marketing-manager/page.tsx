import MarketingDashboardPage from "@/app/marketing/(protected)/dashboard/page"

export default async function SuperadminMarketingManagerPreviewPage() {
  return MarketingDashboardPage({
    searchParams: Promise.resolve({}),
    portal: "superadmin",
  })
}
