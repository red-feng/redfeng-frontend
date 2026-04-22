import AdminBookingsPage from "@/app/admin/(protected)/bookings/page"

export default async function SuperadminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; product?: string; queue?: string; focus?: string; q?: string; sort?: string }>
}) {
  return AdminBookingsPage({ searchParams, portal: "superadmin" })
}
