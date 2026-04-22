import AdminBookingDetailPage from "@/app/admin/(protected)/bookings/[id]/page"

export default async function SuperadminBookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{
    success?: string
    error?: string
    note_status?: string
    note_type?: string
    note_pin?: string
  }>
}) {
  return AdminBookingDetailPage({ params, searchParams, portal: "superadmin" })
}
