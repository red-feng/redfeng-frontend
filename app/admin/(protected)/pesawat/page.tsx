import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"

export default function AdminFlightsWorkspacePage() {
  return (
    <AdminProductWorkspace
      productType="flight"
      productLabel="Pesawat"
      description="Workspace Pesawat sekarang dipakai untuk booking affiliate dasar, sehingga tim operasional bisa mulai mencatat supplier, rute, jadwal, dan status issue tiket tanpa tercampur dengan workflow Paket Tour."
      statusLabel="Flow operasional aktif"
      statusNote="Booking affiliate Pesawat sudah menyimpan route, cabin, trip type, dan jadwal pulang untuk fondasi promo checkout. Katalog customer dan checkout live masih tahap berikutnya."
      primaryActionHref="/admin/pesawat/bookings/new"
      primaryActionLabel="Buat booking Pesawat"
      secondaryActionHref="/admin/bookings?product=pesawat"
      secondaryActionLabel="Lihat booking Pesawat"
      preparedModules={["Create booking", "Supplier affiliate", "Flight details", "Trip contract", "Issue status", "Promo-ready context"]}
    />
  )
}
