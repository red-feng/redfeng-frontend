import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"

export default function AdminHotelWorkspacePage() {
  return (
    <AdminProductWorkspace
      productLabel="Hotel"
      description="Submenu admin untuk Hotel dipisahkan agar inventory kamar, supplier, rate plan, dan operasional hotel bisa punya workflow sendiri."
      primaryActionHref="/admin/bookings?product=hotel"
      primaryActionLabel="Lihat booking Hotel"
      secondaryActionHref="/admin/dashboard"
      secondaryActionLabel="Kembali ke dashboard admin"
    />
  )
}
