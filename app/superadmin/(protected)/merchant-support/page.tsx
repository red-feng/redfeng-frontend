import AdminMerchantSupportPage from "@/app/admin/(protected)/merchant-support/page"

export default async function SuperadminMerchantSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ room_id?: string }>
}) {
  return AdminMerchantSupportPage({ searchParams, portal: "superadmin" })
}
