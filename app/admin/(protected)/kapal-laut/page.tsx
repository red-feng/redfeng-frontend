import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"

export default function AdminSeaShipWorkspacePage() {
  return (
    <AdminProductWorkspace
      productType="sea"
      productLabel="Kapal Laut"
      description="Submenu admin untuk Kapal Laut sudah dipisahkan agar route, operator, manifest, dan validasi operasional bisa punya workflow tersendiri."
      primaryActionHref="/admin/bookings?product=kapal-laut"
      primaryActionLabel="Lihat booking Kapal Laut"
      secondaryActionHref="/admin/dashboard"
      secondaryActionLabel="Kembali ke dashboard admin"
    />
  )
}
