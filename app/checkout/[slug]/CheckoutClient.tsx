"use client";

import { useState } from "react";

export default function CheckoutClient({ data, slug }: any) {

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const publicPrice = data.pricing?.dewasa ?? 0;

  const adminFee = publicPrice * 0.03;
  const subtotal = publicPrice + adminFee;
  const ppn = subtotal * 0.11;
  const total = subtotal + ppn;

  const handleBooking = async () => {

    const bookingRes = await fetch(
      "https://redfeng.co/wp-json/redfeng/v1/booking",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          nama,
          email,
          phone,
          qty: 1
        })
      }
    );

    const bookingData = await bookingRes.json();

    if (!bookingData.booking_id) {
      alert("Gagal membuat booking");
      return;
    }

    const paymentRes = await fetch(
      "https://redfeng.co/wp-json/redfeng/v1/payment/create",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingData.booking_id
        })
      }
    );

    const paymentData = await paymentRes.json();

    if (paymentData.snap_token) {

  (window as any).snap.pay(paymentData.snap_token, {

    onSuccess: function () {
      window.location.href = `/success?code=${bookingData.booking_code}`;
    },

    onPending: function () {
      window.location.href = `/pending?code=${bookingData.booking_code}`;
    },

    onError: function () {
      window.location.href = `/failed?code=${bookingData.booking_code}`;
    },

    onClose: function () {
      console.log("User closed payment popup");
    }

  });

  }
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
