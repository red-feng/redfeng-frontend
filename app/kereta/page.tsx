import TrainMarketingLanding from "@/app/components/trains/TrainMarketingLanding"

export const dynamic = "force-dynamic"

type TrainPageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function TrainPage({ searchParams }: TrainPageProps) {
  return <TrainMarketingLanding searchParams={searchParams ? await searchParams : undefined} />
}
