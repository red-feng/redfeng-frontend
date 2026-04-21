import { createClient } from "@/lib/supabase/server"

export default async function MerchantDashboard() {
  const supabase = await createClient("merchant")

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

<h2>Tambah Paket</h2>

<a
  href="/merchant/paket/tambah?step=1"
  style={{
    display: "inline-block",
    padding: "10px 20px",
    background: "black",
    color: "white",
    borderRadius: "8px",
    textDecoration: "none",
    marginBottom: "20px"
  }}
>
  + Buat Paket Baru
</a>


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
