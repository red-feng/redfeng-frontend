import FlightsMarketingLanding from "@/app/components/flights/FlightsMarketingLanding"

export const dynamic = "force-dynamic"

type FlightsPageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function FlightsPage({ searchParams }: FlightsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  return <FlightsMarketingLanding searchParams={resolvedSearchParams} />
}
