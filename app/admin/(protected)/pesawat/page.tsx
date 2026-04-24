import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"

export default function AdminFlightsWorkspacePage() {
  return (
    <AdminProductWorkspace
      productType="flight"
      productLabel="Pesawat"
      description="Workspace Pesawat sekarang dipakai untuk booking affiliate dasar, sehingga tim operasional bisa mulai mencatat supplier, rute, jadwal, dan status issue tiket tanpa tercampur dengan workflow Paket Tour."
      statusLabel="Flow dasar aktif"
      statusNote="Create booking affiliate Pesawat sudah tersedia. Queue supplier dan sinkronisasi API bisa menyusul di tahap berikutnya."
      primaryActionHref="/admin/pesawat/bookings/new"
      primaryActionLabel="Buat booking Pesawat"
      secondaryActionHref="/admin/bookings?product=pesawat"
      secondaryActionLabel="Lihat booking Pesawat"
      preparedModules={["Create booking", "Supplier affiliate", "Flight details", "Booking Center", "Issue status"]}
    />
  )
}
