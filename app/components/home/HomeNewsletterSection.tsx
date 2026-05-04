export default function HomeNewsletterSection() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 pb-8 sm:px-6 lg:px-8">
      <div
        className="relative overflow-hidden rounded-[22px] border border-[#f4ddd5] bg-cover bg-center bg-no-repeat px-4 py-5 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.2)] lg:px-6 lg:py-6"
        style={{
          backgroundImage: "url('/home-assets/newsletter-bg-china-2.png')",
          backgroundPosition: "center top",
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,251,248,0.62)_0%,rgba(255,248,244,0.42)_38%,rgba(255,244,239,0.22)_62%,rgba(255,246,241,0.38)_100%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="relative z-10">
            <h2 className="max-w-[240px] text-[18px] font-black leading-8 tracking-[-0.04em] text-slate-900 lg:max-w-none lg:text-[28px]">Dapatkan promo & info terbaru dari RedFeng!</h2>
            <p className="mt-3 max-w-[220px] text-[13px] leading-6 text-slate-600 lg:max-w-sm">
              Berlangganan newsletter kami dan dapatkan penawaran menarik setiap minggunya.
            </p>
          </div>
          <div className="relative z-10 grid grid-cols-[1fr_auto] gap-3">
            <input
              type="email"
              placeholder="Masukkan email Anda"
              className="h-12 rounded-xl border border-white bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 shadow-[0_12px_26px_-20px_rgba(15,23,42,0.25)]"
            />
            <button className="h-12 min-w-[116px] rounded-xl bg-[#ef3b2d] px-6 text-sm font-semibold text-white shadow-[0_18px_34px_-22px_rgba(239,59,45,0.7)]">Langganan</button>
          </div>
        </div>
      </div>
    </section>
  )
}
