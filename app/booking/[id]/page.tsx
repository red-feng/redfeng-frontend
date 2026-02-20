import { supabase } from "@/lib/supabase";

async function getBooking(id: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export default async function BookingPage({
  params,
}: {
  params: { id: string };
}) {
  const booking = await getBooking(params.id);

  if (!booking) {
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
          <p><strong>Total:</strong> Rp {booking.total.toLocaleString("id-ID")}</p>
          <p><strong>Status:</strong> {booking.status}</p>
        </div>
      </div>
    </main>
  );
}