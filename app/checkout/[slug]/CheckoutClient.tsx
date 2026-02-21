"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from '@/lib/supabase/client'

declare global {
  interface Window {
    snap: any;
  }
}


export default function CheckoutClient({ data, slug }: any) {

  const supabase = createClient()  // 🔥 TAMBAHKAN INI

  
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const router = useRouter();
  const publicPrice = data.pricing?.dewasa ?? 0;
  const adminFee = publicPrice * 0.03;
  const subtotal = publicPrice + adminFee;
  const ppn = subtotal * 0.11;
  const total = Math.round(subtotal + ppn);

  const handleBooking = async () => {
  console.log("STEP 1: mulai booking");

  const bookingCode = `RF-${Date.now()}`;

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert([
      {
        booking_code: bookingCode,
        slug,
        customer_name: nama,
        customer_email: email,
        customer_phone: phone,
        public_price: publicPrice,
        admin_fee: adminFee,
        ppn,
        total_amount: total,
        booking_status: "pending",
        payment_status: "pending",
      },
    ])
    .select()
    .single();

  console.log("STEP 2: insert selesai", booking);

  if (error || !booking) {
    console.error(error);
    alert("Gagal menyimpan booking");
    return;
  }

  console.log("STEP 3: panggil payment create");

  const res = await fetch("/api/payment/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ booking_id: booking.id }),
  });

  console.log("STEP 4: response create", res);

  const snapData = await res.json();
  console.log("STEP 5: snapData", snapData);

  if (!snapData.token) {
    alert("Gagal membuat transaksi");
    return;
  }

  if (!window.snap) {
    alert("Snap belum siap");
    return;
  }

  console.log("STEP 6: buka snap");

  window.snap.pay(snapData.token);
};

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow">

        <h1 className="text-3xl font-bold mb-6">Checkout</h1>

        <div className="space-y-3 text-lg mb-6">
          <div className="flex justify-between">
            <span>Total Bayar</span>
            <span>Rp {total.toLocaleString("id-ID")}</span>
          </div>
        </div>

        <div className="space-y-4">

          <input
            placeholder="Nama"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <button
            onClick={handleBooking}
            className="w-full bg-blue-600 text-white py-3 rounded-lg"
          >
            Buat Booking & Bayar
          </button>

        </div>

      </div>
    </main>
  );
}
