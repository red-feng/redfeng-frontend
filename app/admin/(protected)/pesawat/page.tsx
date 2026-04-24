import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"

export default function AdminFlightsWorkspacePage() {
  return (
    <AdminProductWorkspace
      productType="flight"
      productLabel="Pesawat"
      description="Submenu admin untuk produk Pesawat sudah disiapkan terpisah agar nanti queue supplier, fare rules, schedule, dan operasional bisa berdiri sendiri tanpa bercampur dengan Paket Tour."
      primaryActionHref="/admin/bookings?product=pesawat"
      primaryActionLabel="Lihat booking Pesawat"
      secondaryActionHref="/admin/dashboard"
      secondaryActionLabel="Kembali ke dashboard admin"
    />
  )
}
