import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !booking) {
    return <div className="p-10">Booking tidak ditemukan</div>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow">
        <h1 className="text-3xl font-bold mb-6">Booking Berhasil 🎉</h1>

        <div className="space-y-2 text-lg">
          <p><strong>Kode Booking:</strong> {booking.booking_code}</p>
          <p><strong>Nama:</strong> {booking.customer_name}</p>
          <p><strong>Email:</strong> {booking.customer_email}</p>
          <p><strong>Total:</strong> Rp {Number(booking.total).toLocaleString("id-ID")}</p>
          <p><strong>Status:</strong> {booking.status}</p>
        </div>
      </div>
    </main>
  );
}