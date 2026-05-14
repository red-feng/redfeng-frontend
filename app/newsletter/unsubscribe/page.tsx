import Link from "next/link"
import { normalizeNewsletterLocale, normalizeNewsletterEmail, verifyNewsletterUnsubscribeToken } from "@/lib/newsletter-unsubscribe"
import { createAdminClient } from "@/lib/supabase/admin"

type NewsletterUnsubscribeSearchParams = {
  email?: string
  token?: string
  locale?: string
}

const copy = {
  id: {
    eyebrow: "Newsletter",
    successTitle: "Langganan newsletter berhasil dihentikan.",
    successBody: "Email Anda tidak akan lagi menerima campaign newsletter RedFeng berikutnya.",
    alreadyTitle: "Email ini sudah tidak berlangganan.",
    alreadyBody: "Tidak ada tindakan tambahan yang perlu dilakukan. Anda tidak akan menerima campaign newsletter baru.",
    invalidTitle: "Tautan unsubscribe tidak valid.",
    invalidBody: "Tautan ini tidak bisa dipakai. Coba lagi dari email campaign terbaru atau hubungi tim RedFeng.",
    home: "Kembali ke homepage",
    packages: "Lihat halaman paket",
  },
  en: {
    eyebrow: "Newsletter",
    successTitle: "You have been unsubscribed successfully.",
    successBody: "Your email will no longer receive upcoming RedFeng newsletter campaigns.",
    alreadyTitle: "This email is already unsubscribed.",
    alreadyBody: "No further action is needed. You will not receive new newsletter campaigns.",
    invalidTitle: "This unsubscribe link is invalid.",
    invalidBody: "Please retry from the latest campaign email or contact the RedFeng team.",
    home: "Back to homepage",
    packages: "Browse packages",
  },
  zh: {
    eyebrow: "Newsletter",
    successTitle: "您已成功取消订阅。",
    successBody: "您的邮箱将不再收到后续的 RedFeng newsletter 活动邮件。",
    alreadyTitle: "该邮箱已经取消订阅。",
    alreadyBody: "无需额外操作，您不会再收到新的 newsletter 活动邮件。",
    invalidTitle: "取消订阅链接无效。",
    invalidBody: "请从最新的活动邮件重试，或联系 RedFeng 团队。",
    home: "返回首页",
    packages: "查看套餐",
  },
} as const

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams?: Promise<NewsletterUnsubscribeSearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const locale = normalizeNewsletterLocale(params.locale)
  const email = normalizeNewsletterEmail(params.email)
  const token = String(params.token || "").trim()
  const t = copy[locale]

  let state: "success" | "already" | "invalid" = "invalid"

  if (email && token && verifyNewsletterUnsubscribeToken(email, token)) {
    const adminSupabase = createAdminClient()
    const { data: subscriber } = await adminSupabase
      .from("newsletter_subscribers")
      .select("id, status")
      .eq("email", email)
      .maybeSingle()

    if (subscriber?.id) {
      if (subscriber.status === "unsubscribed") {
        state = "already"
      } else {
        await adminSupabase
          .from("newsletter_subscribers")
          .update({
            status: "unsubscribed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscriber.id)
        state = "success"
      }
    } else {
      state = "already"
    }
  }

  const title = state === "success" ? t.successTitle : state === "already" ? t.alreadyTitle : t.invalidTitle
  const body = state === "success" ? t.successBody : state === "already" ? t.alreadyBody : t.invalidBody
  const tone =
    state === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : state === "already"
        ? "border-slate-200 bg-slate-100 text-slate-700"
        : "border-rose-200 bg-rose-50 text-rose-700"

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-6 py-8 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:px-8">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
            {t.eyebrow}
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-orange-50/90 sm:text-base">{body}</p>
          {email ? <p className="mt-4 text-sm font-medium text-orange-50/80">{email}</p> : null}
        </section>

        <section className={`mt-6 rounded-[24px] border px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ${tone}`}>
          <p className="text-sm leading-7">{body}</p>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {t.home}
          </Link>
          <Link
            href="/packages"
            className="inline-flex rounded-full border border-[#e6d8c2] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t.packages}
          </Link>
        </div>
      </div>
    </main>
  )
}
