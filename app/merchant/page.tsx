import { createClient } from "../../lib/supabase/server"
import { createTour } from "./actions"

export default async function MerchantDashboard() {
  const supabase = await createClient()   // ✅ WAJIB await

  const {
  data: { user },
} = await supabase.auth.getUser()

if (!user) {
  return <div>User tidak ditemukan</div>
}

const { data: merchant } = await supabase
  .from("merchants")
  .select("*")
  .eq("user_id", user.id) // ✅ tidak pakai ?
  .single()

  // Fetch tours (RLS jalan)
  const { data: tours } = await supabase
    .from("tours")
    .select("*")

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard Merchant</h1>

      <h2>Company: {merchant?.company_name}</h2>

      <hr />

      {/* FORM TAMBAH PAKET */}
      <h2>Tambah Paket</h2>
      <form action={createTour}>
        <input name="title" placeholder="Nama Paket" required />
        <button type="submit">Tambah Paket</button>
      </form>

      <hr />

      {/* LIST PAKET */}
      <h2>Daftar Paket</h2>

      {tours?.length === 0 && <p>Belum ada paket</p>}

      {tours?.map((tour) => (
        <div key={tour.id}>
          <h3>{tour.title}</h3>
          <p>Status: {tour.status}</p>
        </div>
      ))}
    </div>
  )
}