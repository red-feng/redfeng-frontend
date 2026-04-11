'use client'

import Link from "next/link"
import { useState } from "react"
import AuthLocaleDropdown from "@/app/components/AuthLocaleDropdown"
import PasswordField from "@/app/components/PasswordField"
import { createClient } from "@/lib/supabase/client"
import { buildInternalAdminEmail, normalizeInternalUsername } from "@/lib/internal-auth"
import { isAdminPortalRole } from "@/lib/internal-roles"
import { readPortalSessionErrorMessage } from "@/lib/portal-session"
import type { Locale } from "@/lib/i18n"

function getAdminLoginCopy(locale: Locale) {
  if (locale === "en") {
    return {
      heroEyebrow: "Red Feng Admin",
      heroTitle: "Secure access for the Red Feng internal team.",
      heroBody:
        "This page is dedicated to administrators who manage merchant reviews, packages, bookings, and internal operations.",
      bullets: [
        "Merchant approvals and document revisions",
        "Monitoring bookings, packages, and listing quality",
        "Internal access for admin and operations manager",
      ],
      footer: "Not an admin? Use the merchant or customer portal based on your account role.",
      cardEyebrow: "Admin Login",
      cardTitle: "Sign in to admin dashboard",
      cardBody: "Use the internal username created by the operations manager.",
      backHome: "Back to homepage",
      usernameLabel: "Admin username",
      usernamePlaceholder: "e.g. admin.operations",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter admin password",
      passwordHint: "Password reset is managed by the operations manager.",
      submitIdle: "Enter admin dashboard",
      submitLoading: "Signing in...",
      noSession: "Your admin session has ended or was replaced. Please sign in again.",
      noProfile: "This internal account does not have a valid admin profile yet.",
      wrongPortalPrefix: "The admin portal accepts admin or operations manager roles.",
      noSessionShort: "Admin session could not be created yet. Please try signing in again.",
      emptyFields: "Username and password are required.",
      invalidCredentials: "Invalid admin username or password.",
      noAccess: "This account does not have admin access yet.",
      superadminOnly: "This portal is for admin and operations manager only. Please use the superadmin portal.",
      wrongRole: "This portal is for admin and operations manager only.",
    }
  }

  if (locale === "zh") {
    return {
      heroEyebrow: "Red Feng 管理后台",
      heroTitle: "为 Red Feng 内部团队提供安全访问。",
      heroBody: "此页面仅供管理商家审核、套餐、预订和内部运营的管理员使用。",
      bullets: ["商家审批与文件修订", "监控预订、套餐与列表质量", "管理员与运营经理的内部访问"],
      footer: "不是管理员？请根据您的账号角色使用商家或客户入口。",
      cardEyebrow: "管理员登录",
      cardTitle: "登录管理后台",
      cardBody: "请使用由运营经理创建的内部用户名。",
      backHome: "返回首页",
      usernameLabel: "管理员用户名",
      usernamePlaceholder: "例如：admin.operasional",
      passwordLabel: "密码",
      passwordPlaceholder: "输入管理员密码",
      passwordHint: "密码重置由运营经理处理。",
      submitIdle: "进入管理后台",
      submitLoading: "登录中...",
      noSession: "您的管理员会话已结束或被替换，请重新登录。",
      noProfile: "此内部账号尚未拥有有效的管理员资料。",
      wrongPortalPrefix: "管理员门户仅接受管理员或运营经理角色。",
      noSessionShort: "管理员会话尚未建立，请重新登录。",
      emptyFields: "用户名和密码为必填项。",
      invalidCredentials: "管理员用户名或密码无效。",
      noAccess: "此账号尚未拥有管理员访问权限。",
      superadminOnly: "此入口仅限管理员和运营经理使用。请改用超级管理员入口。",
      wrongRole: "此入口仅限管理员和运营经理使用。",
    }
  }

  return {
    heroEyebrow: "Red Feng Admin",
    heroTitle: "Secure access untuk tim internal Red Feng.",
    heroBody:
      "Halaman ini khusus untuk administrator yang mengelola merchant review, paket, booking, dan operasional internal.",
    bullets: [
      "Merchant approvals dan revisi dokumen",
      "Monitoring booking, paket, dan kualitas listing",
      "Akses internal untuk admin dan operations manager",
    ],
    footer: "Bukan admin? Gunakan portal merchant atau customer sesuai peran akun Anda.",
    cardEyebrow: "Admin Login",
    cardTitle: "Masuk ke admin dashboard",
    cardBody: "Gunakan username internal yang dibuat oleh operations manager.",
    backHome: "Kembali ke beranda",
    usernameLabel: "Username admin",
    usernamePlaceholder: "mis: admin.operasional",
    passwordLabel: "Password",
    passwordPlaceholder: "Masukkan password admin",
    passwordHint: "Reset password dikelola oleh operations manager.",
    submitIdle: "Masuk ke admin dashboard",
    submitLoading: "Memproses login...",
    noSession: "Sesi admin Anda sudah berakhir atau tergantikan. Silakan login lagi.",
    noProfile: "Akun internal ini belum memiliki profile admin yang valid.",
    wrongPortalPrefix: "Portal admin menerima role admin atau operations manager.",
    noSessionShort: "Sesi admin belum terbentuk. Coba login ulang.",
    emptyFields: "Username dan password wajib diisi.",
    invalidCredentials: "Username atau password admin tidak valid.",
    noAccess: "Akun ini belum memiliki akses admin.",
    superadminOnly: "Portal ini khusus untuk admin dan operations manager. Gunakan portal superadmin.",
    wrongRole: "Portal ini khusus untuk admin dan operations manager.",
  }
}

export default function AdminLoginClient({ initialLocale }: { initialLocale: Locale }) {
  const supabase = createClient()
  const t = getAdminLoginCopy(initialLocale)

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [systemError] = useState(() => {
    if (typeof window === "undefined") return ""
    const params = new URLSearchParams(window.location.search)
    return params.get("error") || ""
  })
  const systemErrorMessage =
    readPortalSessionErrorMessage(systemError, {
      noSession: t.noSession,
      noProfile: t.noProfile,
      wrongPortalPrefix: t.wrongPortalPrefix,
    }) || (systemError === "no-session" ? t.noSessionShort : "")

  const handleLogin = async () => {
    setLoading(true)
    setError("")

    const normalizedUsername = normalizeInternalUsername(username)
    if (!normalizedUsername || !password) {
      setError(t.emptyFields)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: buildInternalAdminEmail(normalizedUsername),
      password,
    })

    if (signInError || !data.user) {
      setError(signInError?.message || t.invalidCredentials)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle()

    if (!profile) {
      setError(t.noAccess)
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (profile.role === "superadmin") {
      setError(t.superadminOnly)
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (isAdminPortalRole(profile.role)) {
      window.location.assign("/admin/dashboard")
      setLoading(false)
      return
    }

    setError(t.wrongRole)
    await supabase.auth.signOut()
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f6f0e8_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-[36px] border border-orange-200/60 bg-white shadow-[0_32px_110px_rgba(146,64,14,0.16)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden bg-[linear-gradient(145deg,#7c2d12_0%,#c2410c_36%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_30%)]" />
          <div className="relative flex h-full flex-col">
            <span className="inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
              {t.heroEyebrow}
            </span>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">{t.heroTitle}</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-orange-50/92">{t.heroBody}</p>

            <div className="mt-10 grid gap-4">
              {t.bullets.map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-white/18 bg-white/10 px-5 py-4 text-sm leading-7 text-orange-50/90 backdrop-blur"
                >
                  <span className="mr-3 text-amber-200">•</span>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-auto pt-10 text-sm text-orange-100/85">{t.footer}</div>
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
                    href="https://redfeng.co/"
                    className="inline-flex items-center gap-2 text-sm font-medium text-orange-700 transition hover:text-orange-800"
                  >
                    {t.backHome}
                    <span aria-hidden="true">-&gt;</span>
                  </Link>
                </div>
              </div>

              {systemErrorMessage ? (
                <div className="mt-8 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {systemErrorMessage}
                </div>
              ) : null}

              {error ? (
                <div className="mt-8 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="mt-8 space-y-6">
                <div className="space-y-3">
                  <label htmlFor="admin-username" className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {t.usernameLabel}
                  </label>
                  <input
                    id="admin-username"
                    type="text"
                    autoComplete="username"
                    className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder={t.usernamePlaceholder}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="admin-password" className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {t.passwordLabel}
                  </label>
                  <PasswordField
                    id="admin-password"
                    autoComplete="current-password"
                    className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 pr-28 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder={t.passwordPlaceholder}
                    value={password}
                    onChange={setPassword}
                  />
                  <div className="flex justify-end">
                    <span className="text-sm font-medium text-orange-700">{t.passwordHint}</span>
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
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
