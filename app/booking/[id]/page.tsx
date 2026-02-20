async function getBooking(id: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      cache: "no-store",
    }
  );

  const data = await res.json();
  return data[0] || null;
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
          <p><strong>Total:</strong> Rp {Number(booking.total).toLocaleString("id-ID")}</p>
          <p><strong>Status:</strong> {booking.status}</p>
        </div>
      </div>
    </main>
  );
}