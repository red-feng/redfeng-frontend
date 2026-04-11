import Link from "next/link"

export default function PendingPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f6f0e8_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[36px] border border-orange-200/60 bg-white shadow-[0_28px_90px_rgba(146,64,14,0.12)]">
        <section className="bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_48%,#fdba74_100%)] px-8 py-10 text-white sm:px-10">
          <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
            Merchant Review
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Akun merchant Anda sedang diverifikasi</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-orange-50/90">
            Tim Red Feng sedang meninjau data bisnis dan dokumen yang Anda kirim. Review berjalan bertahap: admin meninjau lebih dulu, lalu operations manager memberi keputusan final sebelum akses merchant dibuka penuh.
          </p>
        </section>

        <section className="grid gap-6 bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f1_100%)] px-8 py-10 sm:px-10 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_20px_50px_rgba(148,64,14,0.08)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                <span className="text-xl font-semibold">!</span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Verification status</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">Admin review or manager decision in progress</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              Selama status review masih berjalan, Anda belum dapat mengakses merchant dashboard penuh. Jika diperlukan, tim Red Feng akan menghubungi Anda melalui email bisnis yang terdaftar.
            </p>
          </article>

          <aside className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-6">
            <div className="flex items-center gap-3 text-slate-900">
              <span className="text-base font-semibold text-orange-700">+</span>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Langkah berikutnya</p>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <li>Admin akan memeriksa data perusahaan, legal, rekening, dan dokumen lebih dulu.</li>
              <li>Jika review admin selesai, pengajuan Anda akan diajukan ke operations manager untuk keputusan final.</li>
              <li>Operations manager dapat menyetujui atau meminta revisi data merchant.</li>
              <li>Jika ada revisi, Anda akan diarahkan untuk memperbaiki pengajuan dalam batas waktu yang diberikan.</li>
              <li>Jika disetujui, akses merchant dashboard akan dibuka.</li>
            </ul>
            <Link
              href="https://redfeng.co/"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-700 transition hover:text-orange-800"
            >
              Kembali ke beranda
              <span aria-hidden="true">{">"}</span>
            </Link>
          </aside>
        </section>
      </div>
    </main>
  )
}
