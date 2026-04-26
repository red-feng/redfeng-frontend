import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"

export default function AdminTrainWorkspacePage() {
  return (
    <AdminProductWorkspace
      productType="train"
      productLabel="Kereta Api"
      description="Submenu admin untuk Kereta Api siap dipakai saat modul tiket kereta aktif, termasuk untuk schedule, provider, dan pengecekan operasional."
      statusNote="Flow booking Kereta Api belum live, jadi spread harga dan biaya supplier belum tercatat otomatis di dashboard profit RedFeng."
      primaryActionHref="/admin/bookings?product=kereta-api"
      primaryActionLabel="Lihat booking Kereta Api"
      secondaryActionHref="/admin/dashboard"
      secondaryActionLabel="Kembali ke dashboard admin"
    />
  )
}
