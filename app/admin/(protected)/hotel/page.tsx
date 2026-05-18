import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"

export default function AdminHotelWorkspacePage() {
  return (
    <AdminProductWorkspace
      productType="hotel"
      productLabel="Hotel"
      description="Submenu admin untuk Hotel dipisahkan agar inventory kamar, supplier, rate plan, dan operasional hotel bisa punya workflow sendiri."
      statusNote="Flow booking Hotel belum live, jadi spread harga dan biaya supplier belum tercatat otomatis di dashboard profit RedFeng. Fondasi promo transaksi hotel-ready sudah disiapkan untuk city, star rating, check-in/check-out, dan durasi inap saat katalog customer nanti disambungkan."
      primaryActionHref="/admin/bookings?product=hotel"
      primaryActionLabel="Lihat booking Hotel"
      secondaryActionHref="/admin/dashboard"
      secondaryActionLabel="Kembali ke dashboard admin"
    />
  )
}
