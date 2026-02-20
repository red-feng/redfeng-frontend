import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return <div className="p-10">Booking tidak ditemukan</div>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow">
        <h1 className="text-3xl font-bold mb-6">Booking Berhasil 🎉</h1>

        <div className="space-y-2 text-lg">
          <p><strong>Kode Booking:</strong> {data.booking_code}</p>
          <p><strong>Nama:</strong> {data.customer_name}</p>
          <p><strong>Email:</strong> {data.customer_email}</p>
          <p><strong>Total:</strong> Rp {Number(data.total).toLocaleString("id-ID")}</p>
          <p><strong>Status:</strong> {data.status}</p>
        </div>
      </div>
    </main>
  );
}