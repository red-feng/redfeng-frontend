import BusMarketingLanding from "@/app/components/bus/BusMarketingLanding"

export const dynamic = "force-dynamic"

type BusPageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function BusPage({ searchParams }: BusPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  return <BusMarketingLanding searchParams={resolvedSearchParams} />
}
