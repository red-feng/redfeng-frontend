import { createClient } from "@/lib/supabase/server"
import { createPackage } from "./actions"

export default async function MerchantDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div>User tidak ditemukan</div>
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("user_id", user.id)
    .single()

  // 🔥 GANTI tours → packages
  const { data: packages } = await supabase
    .from("packages")
    .select("*")
    .eq("merchant_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard Merchant</h1>

      <h2>Company: {merchant?.company_name}</h2>

      <hr />

      {/* FORM TAMBAH PAKET */}
      <h2>Tambah Paket</h2>
      <form action={createPackage}>
        <input name="title" placeholder="Nama Paket" required />
        <input name="country" placeholder="Country" required />
        <input name="city" placeholder="City" required />
        <input name="duration" placeholder="Durasi (hari)" type="number" required />
        <input name="price_adult" placeholder="Harga Dewasa" type="number" required />
        <input name="price_child" placeholder="Harga Anak" type="number" />
        <input name="currency" placeholder="Currency (IDR/USD)" defaultValue="IDR" />

        <button type="submit">Tambah Paket</button>
      </form>

      <hr />

      {/* LIST PAKET */}
      <h2>Daftar Paket</h2>

      {packages?.length === 0 && <p>Belum ada paket</p>}

      {packages?.map((pkg) => (
        <div key={pkg.id}>
          <h3>{pkg.title}</h3>
          <p>Status: {pkg.status}</p>
        </div>
      ))}
    </div>
  )
}