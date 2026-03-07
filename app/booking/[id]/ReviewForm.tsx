export default function ReviewForm({
  bookingId,
  packageId,
  customerName,
  submitAction,
}: {
  bookingId: string
  packageId: string
  customerName: string
  submitAction: (formData: FormData) => Promise<void>
}) {
  return (
    <form action={submitAction} className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="package_id" value={packageId} />
      <input type="hidden" name="customer_name" value={customerName} />

      <h2 className="text-xl font-semibold text-slate-900">Berikan Review</h2>
      <p className="mt-1 text-sm text-slate-500">Nilai paket dan tulis komentar customer untuk merchant.</p>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">Rating</label>
        <select
          name="rating"
          required
          className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none ring-orange-500 focus:ring-2"
          defaultValue=""
        >
          <option value="" disabled>
            Pilih rating
          </option>
          <option value="5">5 - Sangat puas</option>
          <option value="4">4 - Puas</option>
          <option value="3">3 - Cukup</option>
          <option value="2">2 - Kurang puas</option>
          <option value="1">1 - Buruk</option>
        </select>
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">Komentar</label>
        <textarea
          name="comment"
          rows={4}
          placeholder="Bagikan pengalaman Anda selama trip"
          className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none ring-orange-500 focus:ring-2"
        />
      </div>

      <button
        type="submit"
        className="mt-5 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
      >
        Kirim Review
      </button>
    </form>
  )
}
