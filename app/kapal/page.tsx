import ShipMarketingLanding from "@/app/components/ships/ShipMarketingLanding"

export const dynamic = "force-dynamic"

type ShipPageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function ShipPage({ searchParams }: ShipPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  return <ShipMarketingLanding searchParams={resolvedSearchParams} />
}
