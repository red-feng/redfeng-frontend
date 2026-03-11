import Link from "next/link"

const accessCards = [
  {
    eyebrow: "Customer",
    title: "Akses traveler dan customer",
    description:
      "Masuk untuk booking, melihat pesanan, mengelola profil, dan melanjutkan perjalanan customer Anda.",
    href: "/login",
    cta: "Masuk sebagai Customer",
    secondaryHref: "/register",
    secondaryLabel: "Buat akun customer",
    accent: "from-orange-700 via-orange-500 to-amber-300",
  },
  {
    eyebrow: "Merchant",
    title: "Portal partner dan merchant",
    description:
      "Masuk untuk mengelola paket, status onboarding, booking merchant, dan operasional partner Red Feng.",
    href: "/merchant/login",
    cta: "Masuk sebagai Merchant",
    secondaryHref: "/merchant/register",
    secondaryLabel: "Daftar sebagai merchant",
    accent: "from-slate-900 via-slate-800 to-orange-500",
  },
  {
    eyebrow: "Admin",
    title: "Akses tim internal Red Feng",
    description:
      "Halaman ini khusus administrator untuk merchant review, quality control, booking oversight, dan operasional internal.",
    href: "/admin/login",
    cta: "Masuk sebagai Admin",
    secondaryHref: "https://redfeng.co/",
    secondaryLabel: "Kembali ke website utama",
    accent: "from-orange-950 via-orange-800 to-orange-500",
  },
]

export default function AccessPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[36px] border border-orange-200/60 bg-white shadow-[0_32px_110px_rgba(146,64,14,0.14)]">
        <section className="relative overflow-hidden bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_34%,#f97316_72%,#fdba74_100%)] px-6 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_28%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Red Feng Access
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
                Pilih jalur akses yang sesuai dengan peran Anda.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-orange-50/92">
                Satu titik masuk yang lebih jelas untuk customer, merchant, dan admin, tanpa mencampur
                alur masing-masing.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[32rem]">
              {["Customer journey", "Merchant operations", "Internal admin"].map((label) => (
                <div
                  key={label}
                  className="rounded-[24px] border border-white/18 bg-white/10 px-4 py-4 text-sm font-medium text-orange-50/92 backdrop-blur"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f1_100%)] px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
          <div className="grid gap-6 lg:grid-cols-3">
            {accessCards.map((card) => (
              <article
                key={card.title}
                className="overflow-hidden rounded-[30px] border border-orange-100 bg-white shadow-[0_20px_60px_rgba(148,64,14,0.08)]"
              >
                <div className={`bg-gradient-to-br ${card.accent} px-6 py-6 text-white`}>
                  <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em]">
                    {card.eyebrow}
                  </span>
                  <h2 className="mt-4 text-2xl font-semibold leading-tight">{card.title}</h2>
                </div>

                <div className="space-y-6 px-6 py-6">
                  <p className="text-sm leading-7 text-slate-600">{card.description}</p>

                  <div className="space-y-3">
                    <Link
                      href={card.href}
                      className="inline-flex w-full items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_42%,#fb923c_100%)] px-5 py-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(194,65,12,0.2)] transition hover:shadow-[0_18px_36px_rgba(194,65,12,0.28)]"
                    >
                      {card.cta}
                    </Link>
                    <Link
                      href={card.secondaryHref}
                      className="inline-flex w-full items-center justify-center rounded-[18px] border border-orange-200 bg-orange-50 px-5 py-4 text-sm font-semibold text-orange-800 transition hover:border-orange-300 hover:bg-orange-100"
                    >
                      {card.secondaryLabel}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
