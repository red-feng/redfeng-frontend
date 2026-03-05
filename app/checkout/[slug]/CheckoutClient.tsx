"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/lib/i18n";

declare global {
  interface Window {
    snap?: {
      pay: (token: string) => void;
    };
  }
}

function checkoutText(locale: Locale) {
  if (locale === "en" || locale === "zh" || locale === "th") {
    return {
      title: "Checkout",
      totalPay: "Total Payment",
      name: "Name",
      email: "Email",
      phone: "Phone",
      createBookingPay: "Create Booking & Pay",
      saveBookingFailed: "Failed to save booking",
      createTransactionFailed: "Failed to create transaction",
      snapNotReady: "Snap is not ready",
    };
  }

  return {
    title: "Checkout",
    totalPay: "Total Bayar",
    name: "Nama",
    email: "Email",
    phone: "Nomor Telepon",
    createBookingPay: "Buat Booking & Bayar",
    saveBookingFailed: "Gagal menyimpan booking",
    createTransactionFailed: "Gagal membuat transaksi",
    snapNotReady: "Snap belum siap",
  };
}

export default function CheckoutClient({
  data,
  slug,
  locale = "id",
}: {
  data: {
    pricing?: {
      dewasa?: number | null;
    };
  };
  slug: string;
  locale?: Locale;
}) {
  const supabase = createClient();
  const t = checkoutText(locale);

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const publicPrice = data.pricing?.dewasa ?? 0;
  const adminFee = publicPrice * 0.03;
  const subtotal = publicPrice + adminFee;
  const ppn = subtotal * 0.11;
  const total = Math.round(subtotal + ppn);

  const handleBooking = async () => {
    const safeEmail = email.trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "guest";
    const bookingCode = `RF-${slug.slice(0, 6).toUpperCase()}-${safeEmail}-${total}`;

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

    if (error || !booking) {
      alert(t.saveBookingFailed);
      return;
    }

    const res = await fetch("/api/payment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: booking.id }),
    });

    const snapData = await res.json();

    if (!snapData.token) {
      alert(t.createTransactionFailed);
      return;
    }

    if (!window.snap) {
      alert(t.snapNotReady);
      return;
    }

    window.snap.pay(snapData.token);
  };

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 shadow">
        <h1 className="mb-6 text-3xl font-bold">{t.title}</h1>

        <div className="mb-6 space-y-3 text-lg">
          <div className="flex justify-between">
            <span>{t.totalPay}</span>
            <span>Rp {total.toLocaleString("id-ID")}</span>
          </div>
        </div>

        <div className="space-y-4">
          <input
            placeholder={t.name}
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full rounded border p-3"
          />

          <input
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border p-3"
          />

          <input
            placeholder={t.phone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded border p-3"
          />

          <button
            onClick={handleBooking}
            className="w-full rounded-lg bg-blue-600 py-3 text-white"
          >
            {t.createBookingPay}
          </button>
        </div>
      </div>
    </main>
  );
}
