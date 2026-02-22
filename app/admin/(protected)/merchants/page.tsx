import { createClient } from "@/lib/supabase/server"

export default async function MerchantsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: merchants } = await supabase
    .from("profiles")
    .select("id, role, approval_status")
    .eq("role", "merchant")

  async function approveMerchant(id: string) {
    "use server"

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // ✅ Update approval
    await supabase
      .from("profiles")
      .update({ approval_status: "approved" })
      .eq("id", id)

    // ✅ Audit log di sini
    await supabase.from("audit_logs").insert({
      user_id: user?.id,
      action: "approve_merchant",
      target_table: "profiles",
      target_id: id,
    })
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Merchant Approval</h1>

      {merchants?.map((merchant) => (
        <div
          key={merchant.id}
          className="border p-4 mb-4 flex justify-between items-center"
        >
          <div>
            <p>ID: {merchant.id}</p>
            <p>Status: {merchant.approval_status}</p>
          </div>

          {merchant.approval_status !== "approved" && (
            <form action={approveMerchant.bind(null, merchant.id)}>
              <button className="bg-green-600 text-white px-4 py-2 rounded">
                Approve
              </button>
            </form>
          )}
        </div>
      ))}
    </div>
  )
}