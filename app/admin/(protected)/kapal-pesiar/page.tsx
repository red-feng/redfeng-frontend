import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"

export default function AdminCruiseWorkspacePage() {
  return (
    <AdminProductWorkspace
      productType="cruise"
      productLabel="Kapal Pesiar"
      description="Submenu admin untuk Kapal Pesiar disiapkan agar itinerary cruise, cabin inventory, supplier, dan operasional bisa dikelola dalam channel yang terpisah."
      primaryActionHref="/admin/bookings?product=kapal-pesiar"
      primaryActionLabel="Lihat booking Kapal Pesiar"
      secondaryActionHref="/admin/dashboard"
      secondaryActionLabel="Kembali ke dashboard admin"
    />
  )
}
