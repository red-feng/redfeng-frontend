import MarketingPromosPage from "@/app/marketing/(protected)/promos/page"

export default async function SuperadminMarketingPromosPreviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string; q?: string; status?: string }>
}) {
  return MarketingPromosPage({
    searchParams,
    portal: "superadmin",
  })
}
