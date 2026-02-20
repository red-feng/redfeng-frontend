"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

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
  alert("Test klik OK");
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
