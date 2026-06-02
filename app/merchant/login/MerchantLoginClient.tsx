'use client'

import Link from "next/link"
import { useEffect, useState } from "react"
import PasswordField from "@/app/components/PasswordField"
import AuthLocaleDropdown from "@/app/components/AuthLocaleDropdown"
import { createClient } from "@/lib/supabase/client"
import { ACTIVE_PORTAL_COOKIE, ACTIVE_PORTAL_MAX_AGE, MERCHANT_PORTAL_DEFAULT_REDIRECT } from "@/lib/portal-context"
import { readPortalSessionErrorMessage } from "@/lib/portal-session"
import type { Locale } from "@/lib/i18n"
import { getSiteBaseUrl } from "@/lib/site-config"

function getMerchantLoginCopy(locale: Locale) {
  if (locale === "en") {
    return {
      eyebrow: "Red Feng Merchant Access",
      heroTitle: "Sign in to a partner workspace that feels more premium and structured.",
      heroBody:
        "Continue running your travel business from the Red Feng merchant dashboard with a login flow that feels more professional and aligned with partner onboarding.",
      journeyEyebrow: "Partner Journey",
      journeyTitle: "Built for verified travel merchants",
      needAccess: "Need access",
      needAccessBody:
        "If you do not have a merchant account yet, create one first and continue to business onboarding to enter the admin review queue.",
      needAccessCta: "Create merchant account",
      cardEyebrow: "Merchant Sign In",
      cardTitle: "Sign in to merchant dashboard",
      cardBody:
        "Use your merchant account to access the partner dashboard, verification status, and active business process.",
      backHome: "Back to homepage",
      emailLabel: "Business email",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter your merchant account password",
      forgotPassword: "Forgot password?",
      submitIdle: "Enter merchant dashboard",
      submitLoading: "Signing in...",
      emptyStateEyebrow: "No account yet?",
      emptyStateBody:
        "Register as a Red Feng merchant, then continue onboarding to enter the admin review process.",
      emptyStateCta: "Register new merchant",
      blockedInactive: "Your merchant account has been temporarily deactivated by admin.",
      blockedDeleted: "Your merchant account has been removed from merchant access by admin.",
      noSession: "Your merchant session has ended or was replaced. Please sign in again.",
      noProfile: "This account does not have a valid merchant profile yet.",
      wrongPortalPrefix: "The merchant portal only accepts merchant accounts.",
      missingAccess: "This account does not have merchant access yet.",
      inactiveDuringLogin: "Your merchant account has been temporarily deactivated by admin.",
      deletedDuringLogin: "Your merchant account has been removed from merchant access by admin.",
      wrongPortal: "This portal is for merchants only.",
      points: [
        {
          title: "Merchant workspace access",
          description: "Open the partner dashboard to manage packages, orders, balance, and performance.",
          icon: "01",
        },
        {
          title: "Business review status",
          description: "See whether your account is still draft, pending review, approved, or needs document revisions.",
          icon: "02",
        },
        {
          title: "Secure authentication",
          description: "Use a verified business email to continue the merchant process securely.",
          icon: "03",
        },
      ],
    }
  }

  if (locale === "zh") {
    return {
      eyebrow: "Red Feng 商家入口",
      heroTitle: "登录更高级、更有条理的合作伙伴工作台。",
      heroBody:
        "通过 Red Feng 商家后台继续管理您的旅游业务，登录流程更专业，也与合作伙伴入驻流程保持一致。",
      journeyEyebrow: "合作伙伴旅程",
      journeyTitle: "为已验证旅游商家打造",
      needAccess: "需要访问权限",
      needAccessBody: "如果您还没有商家账号，请先创建账号，然后继续企业入驻流程以进入管理员审核队列。",
      needAccessCta: "创建商家账号",
      cardEyebrow: "商家登录",
      cardTitle: "登录商家后台",
      cardBody: "使用您的商家账号访问合作伙伴后台、审核状态和当前业务流程。",
      backHome: "返回首页",
      emailLabel: "企业邮箱",
      passwordLabel: "密码",
      passwordPlaceholder: "输入商家账号密码",
      forgotPassword: "忘记密码？",
      submitIdle: "进入商家后台",
      submitLoading: "登录中...",
      emptyStateEyebrow: "还没有账号？",
      emptyStateBody: "注册成为 Red Feng 商家，然后继续入驻流程以进入管理员审核。",
      emptyStateCta: "注册新商家",
      blockedInactive: "您的商家账号已被管理员暂时停用。",
      blockedDeleted: "您的商家账号已被管理员移除商家访问权限。",
      noSession: "您的商家会话已结束或被替换，请重新登录。",
      noProfile: "此账号尚未拥有有效的商家资料。",
      wrongPortalPrefix: "商家门户仅接受商家账号。",
      missingAccess: "此账号尚未拥有商家访问权限。",
      inactiveDuringLogin: "您的商家账号已被管理员暂时停用。",
      deletedDuringLogin: "您的商家账号已被管理员移除商家访问权限。",
      wrongPortal: "此入口仅限商家使用。",
      points: [
        {
          title: "商家工作台访问",
          description: "进入合作伙伴后台，管理套餐、订单、余额和表现。",
          icon: "01",
        },
        {
          title: "企业审核状态",
          description: "查看账号是草稿、待审核、已通过，还是需要补充文件。",
          icon: "02",
        },
        {
          title: "安全认证",
          description: "使用已验证的企业邮箱，安全继续商家流程。",
          icon: "03",
        },
      ],
    }
  }

  return {
    eyebrow: "Red Feng Merchant Access",
    heroTitle: "Masuk ke partner workspace yang terasa lebih premium dan terstruktur.",
    heroBody:
      "Lanjutkan pengelolaan bisnis travel Anda dari dashboard merchant Red Feng, dengan alur login yang lebih profesional dan konsisten dengan partner onboarding.",
    journeyEyebrow: "Partner Journey",
    journeyTitle: "Built for verified travel merchants",
    needAccess: "Need access",
    needAccessBody:
      "Jika belum memiliki akun merchant, buat akun baru lalu lanjutkan ke onboarding bisnis untuk masuk ke antrian review admin.",
    needAccessCta: "Buat akun merchant",
    cardEyebrow: "Merchant Sign In",
    cardTitle: "Masuk ke dashboard merchant",
    cardBody:
      "Gunakan akun merchant Anda untuk mengakses dashboard partner, status verifikasi, dan proses bisnis yang sedang berjalan.",
    backHome: "Kembali ke beranda",
    emailLabel: "Email bisnis",
    passwordLabel: "Password",
    passwordPlaceholder: "Masukkan password akun merchant",
    forgotPassword: "Lupa password?",
    submitIdle: "Masuk ke merchant dashboard",
    submitLoading: "Memproses login...",
    emptyStateEyebrow: "Belum punya akun?",
    emptyStateBody:
      "Daftar sebagai merchant Red Feng lalu lanjutkan onboarding untuk masuk ke proses review admin.",
    emptyStateCta: "Daftar merchant baru",
    blockedInactive: "Akun merchant Anda sedang dinonaktifkan sementara oleh admin.",
    blockedDeleted: "Akun merchant Anda sudah dihapus dari akses merchant oleh admin.",
    noSession: "Sesi merchant Anda sudah berakhir atau tergantikan. Silakan login lagi.",
    noProfile: "Akun ini belum memiliki profil merchant yang valid.",
    wrongPortalPrefix: "Portal merchant hanya menerima akun merchant.",
    missingAccess: "Akun ini belum memiliki akses merchant.",
    inactiveDuringLogin: "Akun merchant Anda sedang dinonaktifkan sementara oleh admin.",
    deletedDuringLogin: "Akun merchant Anda sudah dihapus dari akses merchant oleh admin.",
    wrongPortal: "Portal ini khusus untuk merchant.",
    points: [
      {
        title: "Akses merchant workspace",
        description: "Masuk ke dashboard partner untuk mengelola paket, pesanan, saldo, dan performa.",
        icon: "01",
      },
      {
        title: "Review status bisnis",
        description: "Lihat apakah akun masih draft, pending review, approved, atau perlu revisi dokumen.",
        icon: "02",
      },
      {
        title: "Autentikasi aman",
        description: "Gunakan email bisnis terverifikasi untuk melanjutkan proses merchant dengan aman.",
        icon: "03",
      },
    ],
  }
}

export default function MerchantLoginClient({ initialLocale }: { initialLocale: Locale }) {
  const supabase = createClient("merchant")
  const t = getMerchantLoginCopy(initialLocale)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [blockedStatus] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return new URLSearchParams(window.location.search).get("blocked")
  })
  const [systemError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return new URLSearchParams(window.location.search).get("error")
  })
  const blockedError =
    blockedStatus === "inactive" ? t.blockedInactive : blockedStatus === "deleted" ? t.blockedDeleted : ""
  const systemErrorMessage = readPortalSessionErrorMessage(systemError, {
    noSession: t.noSession,
    noProfile: t.noProfile,
    wrongPortalPrefix: t.wrongPortalPrefix,
  })

  useEffect(() => {
    if (!blockedStatus) return

    void supabase.auth.signOut()
  }, [blockedStatus, supabase])

  const handleLogin = async () => {
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      window.location.assign("/")
      return
    }

    if (typeof document !== "undefined") {
      document.cookie = `${ACTIVE_PORTAL_COOKIE}=merchant; Path=/; Max-Age=${ACTIVE_PORTAL_MAX_AGE}; SameSite=Lax`
    }

    const accessResponse = await fetch("/api/auth/portal-access?portal=merchant", {
      cache: "no-store",
    })
    const access = (await accessResponse.json().catch(() => null)) as {
      hasAccess?: boolean
      merchantStatus?: string | null
    } | null

    if (!accessResponse.ok || !access?.hasAccess) {
      setError(t.missingAccess)
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (access.merchantStatus === "inactive") {
      await supabase.auth.signOut()
      setError(t.inactiveDuringLogin)
      setLoading(false)
      return
    }

    if (access.merchantStatus === "deleted") {
      await supabase.auth.signOut()
      setError(t.deletedDuringLogin)
      setLoading(false)
      return
    }

    if (access.hasAccess) {
      window.location.assign(MERCHANT_PORTAL_DEFAULT_REDIRECT)
    } else {
      setError(t.wrongPortal)
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7f0_0%,#f7f2ea_38%,#f3efe8_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl overflow-hidden rounded-[36px] border border-orange-200/60 bg-white shadow-[0_36px_120px_rgba(146,64,14,0.16)] lg:grid-cols-[1.04fr_0.96fr]">
        <section className="relative overflow-hidden bg-[linear-gradient(145deg,#7c2d12_0%,#c2410c_36%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_30%)]" />
          <div className="absolute -left-24 top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-8 right-0 h-72 w-72 rounded-full bg-amber-200/15 blur-3xl" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.38em] text-orange-100/90">{t.eyebrow}</p>
                <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">{t.heroTitle}</h1>
              </div>
              <div className="hidden rounded-[24px] border border-white/20 bg-white/10 px-5 py-4 backdrop-blur md:block">
                <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">{t.journeyEyebrow}</p>
                <p className="mt-2 text-sm font-medium text-white/90">{t.journeyTitle}</p>
              </div>
            </div>

            <p className="relative mt-8 max-w-2xl text-base leading-8 text-orange-50/92 sm:text-lg">{t.heroBody}</p>

            <div className="relative mt-10 grid gap-4 xl:grid-cols-3">
              {t.points.map((item) => (
                <article key={item.title} className="rounded-[28px] border border-white/20 bg-white/10 p-5 backdrop-blur">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/16">
                    <span className="text-sm font-semibold tracking-[0.18em] text-white">{item.icon}</span>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-orange-50/86">{item.description}</p>
                </article>
              ))}
            </div>

            <div className="relative mt-auto pt-10">
              <div className="rounded-[30px] border border-white/18 bg-slate-950/16 p-6 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-orange-100/80">{t.needAccess}</p>
                <p className="mt-4 text-sm leading-7 text-orange-50/90">{t.needAccessBody}</p>
                <Link
                  href="/merchant/register"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-orange-100"
                >
                  {t.needAccessCta}
                  <span aria-hidden="true">-&gt;</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f1_100%)] px-6 py-10 sm:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-xl">
            <div className="rounded-[32px] border border-orange-100 bg-white p-8 shadow-[0_24px_70px_rgba(148,64,14,0.08)] sm:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-700">
                    {t.cardEyebrow}
                  </span>
                  <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t.cardTitle}</h2>
                  <p className="mt-3 max-w-md text-sm leading-7 text-slate-600 sm:text-base">{t.cardBody}</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <AuthLocaleDropdown locale={initialLocale} />
                  <Link
                    href={getSiteBaseUrl()}
                    className="inline-flex items-center gap-2 text-sm font-medium text-orange-700 transition hover:text-orange-800"
                  >
                    {t.backHome}
                    <span aria-hidden="true">-&gt;</span>
                  </Link>
                </div>
              </div>

              {error || blockedError || systemErrorMessage ? (
                <div className="mt-8 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error || blockedError || systemErrorMessage}
                </div>
              ) : null}

              <div className="mt-8 space-y-6">
                <div className="space-y-3">
                  <label htmlFor="merchant-login-email" className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {t.emailLabel}
                  </label>
                  <input
                    id="merchant-login-email"
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="hello@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="merchant-login-password" className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {t.passwordLabel}
                  </label>
                  <PasswordField
                    id="merchant-login-password"
                    autoComplete="current-password"
                    className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 pr-28 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder={t.passwordPlaceholder}
                    value={password}
                    onChange={setPassword}
                  />
                  <div className="flex justify-end">
                    <Link href="/forgot-password?next=/merchant/login" className="text-sm font-medium text-orange-700 transition hover:text-orange-800">
                      {t.forgotPassword}
                    </Link>
                  </div>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_42%,#fb923c_100%)] px-5 py-4 text-base font-semibold text-white shadow-[0_16px_36px_rgba(194,65,12,0.24)] transition hover:shadow-[0_20px_44px_rgba(194,65,12,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? t.submitLoading : t.submitIdle}
                  <span aria-hidden="true">-&gt;</span>
                </button>
              </div>

              <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{t.emptyStateEyebrow}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{t.emptyStateBody}</p>
                <Link
                  href="/merchant/register"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-700 transition hover:text-orange-800"
                >
                  {t.emptyStateCta}
                  <span aria-hidden="true">-&gt;</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
