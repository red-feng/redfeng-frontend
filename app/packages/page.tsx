import PackagesMarketingLanding from "@/app/components/packages/PackagesMarketingLanding"

export const dynamic = "force-dynamic"

type PackagesPageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function PackagesPage({ searchParams }: PackagesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  return <PackagesMarketingLanding searchParams={resolvedSearchParams} />
}
