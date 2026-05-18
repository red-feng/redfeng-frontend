import ActivitiesMarketingLanding from "@/app/components/activities/ActivitiesMarketingLanding"

export const dynamic = "force-dynamic"

type ActivitiesPageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function ActivitiesPage({ searchParams }: ActivitiesPageProps) {
  return <ActivitiesMarketingLanding searchParams={searchParams ? await searchParams : undefined} />
}
