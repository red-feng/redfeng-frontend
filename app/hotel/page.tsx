import HotelMarketingLanding from "@/app/components/hotel/HotelMarketingLanding"

export const dynamic = "force-dynamic"

type HotelPageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function HotelPage({ searchParams }: HotelPageProps) {
  return <HotelMarketingLanding searchParams={searchParams ? await searchParams : undefined} />
}
