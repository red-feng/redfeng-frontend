import MarketingNewslettersPage from "@/app/marketing/(protected)/newsletters/page"

export default async function SuperadminMarketingNewslettersPreviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string; q?: string; status?: string; source?: string }>
}) {
  return MarketingNewslettersPage({
    searchParams,
    portal: "superadmin",
  })
}
