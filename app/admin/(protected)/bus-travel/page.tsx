import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"

export default function AdminBusTravelWorkspacePage() {
  return (
    <AdminProductWorkspace
      productType="bus"
      productLabel="Bus & Travel"
      description="Submenu admin untuk Bus & Travel sudah dipisahkan agar jadwal, operator, rute, dan validasi operasional bisa berkembang tanpa mengganggu workflow Paket Tour."
      primaryActionHref="/admin/bookings?product=bus-travel"
      primaryActionLabel="Lihat booking Bus & Travel"
      secondaryActionHref="/admin/dashboard"
      secondaryActionLabel="Kembali ke dashboard admin"
    />
  )
}
