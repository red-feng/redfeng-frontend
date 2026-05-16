import CruiseMarketingLanding from "@/app/components/cruises/CruiseMarketingLanding"

export const dynamic = "force-dynamic"

type CruisePageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function CruisePage({ searchParams }: CruisePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  return <CruiseMarketingLanding searchParams={resolvedSearchParams} />
}
