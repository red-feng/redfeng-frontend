import MarketingInspirationPage from "@/app/marketing/(protected)/inspiration/page"

export default async function SuperadminMarketingInspirationPreviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string; q?: string; status?: string }>
}) {
  return MarketingInspirationPage({
    searchParams,
    portal: "superadmin",
  })
}
