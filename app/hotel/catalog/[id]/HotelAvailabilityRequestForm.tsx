"use client"

import { useState } from "react"

type HotelAvailabilityRequestFormProps = {
  hotelId: string
  checkin: string
  checkout: string
  adults: number
  childrenCount: number
  rooms: number
}

type SubmitState =
  | { status: "idle"; message: string }
  | { status: "submitting"; message: string }
  | { status: "success"; message: string; requestCode: string }
  | { status: "error"; message: string }

export default function HotelAvailabilityRequestForm({
  hotelId,
  checkin,
  checkout,
  adults,
  childrenCount,
  rooms,
}: HotelAvailabilityRequestFormProps) {
  const [state, setState] = useState<SubmitState>({ status: "idle", message: "" })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setState({ status: "submitting", message: "Mengirim request availability..." })

    const payload = {
      hotel_id: hotelId,
      checkin,
      checkout,
      adults,
      children: childrenCount,
      rooms,
      customer_name: String(formData.get("customer_name") || ""),
      customer_phone: String(formData.get("customer_phone") || ""),
      customer_email: String(formData.get("customer_email") || ""),
      room_preference: String(formData.get("room_preference") || ""),
      meal_preference: String(formData.get("meal_preference") || ""),
      refund_preference: String(formData.get("refund_preference") || ""),
      customer_note: String(formData.get("customer_note") || ""),
    }

    try {
      const response = await fetch("/api/hotels/availability-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = (await response.json()) as {
        error?: string
        message?: string
        request?: { request_code?: string }
      }

      if (!response.ok) {
        setState({ status: "error", message: result.error || "Request belum bisa dikirim." })
        return
      }

      setState({
        status: "success",
        message: result.message || "Request availability berhasil dikirim.",
        requestCode: result.request?.request_code || "",
      })
      event.currentTarget.reset()
    } catch {
      setState({ status: "error", message: "Koneksi belum stabil. Coba kirim ulang request." })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[8px] border border-[#eadfd5] bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.24)]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">Manual availability check</p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Minta cek ketersediaan</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Tim Red Feng akan validasi kamar, harga final, dan kebijakan hotel sebelum mengirim quote.
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Nama</span>
          <input name="customer_name" required className="mt-1 w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">WhatsApp</span>
          <input name="customer_phone" required className="mt-1 w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Email opsional</span>
          <input name="customer_email" type="email" className="mt-1 w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Kamar</span>
            <select name="room_preference" className="mt-1 w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100">
              <option value="">Fleksibel</option>
              <option value="Standard">Standard</option>
              <option value="Deluxe">Deluxe</option>
              <option value="Family">Family</option>
              <option value="Suite">Suite</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Meal</span>
            <select name="meal_preference" className="mt-1 w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100">
              <option value="">Fleksibel</option>
              <option value="Breakfast">Breakfast</option>
              <option value="Room only">Room only</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Refund</span>
            <select name="refund_preference" className="mt-1 w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100">
              <option value="">Fleksibel</option>
              <option value="Refundable">Refundable</option>
              <option value="Non-refundable">Non-refundable</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Catatan</span>
          <textarea name="customer_note" rows={3} className="mt-1 w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
        </label>
      </div>

      {state.status !== "idle" ? (
        <div className={`mt-4 rounded-[8px] border px-3 py-2 text-sm ${state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : state.status === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-orange-200 bg-orange-50 text-orange-700"}`}>
          {state.message}
          {state.status === "success" && state.requestCode ? <span className="mt-1 block font-semibold">Kode request: {state.requestCode}</span> : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={state.status === "submitting"}
        className="mt-5 w-full rounded-[8px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state.status === "submitting" ? "Mengirim..." : "Kirim request availability"}
      </button>
    </form>
  )
}
