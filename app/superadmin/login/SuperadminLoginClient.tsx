'use client'

import Link from "next/link"
import { useState } from "react"
import AuthLocaleDropdown from "@/app/components/AuthLocaleDropdown"
import PasswordField from "@/app/components/PasswordField"
import { createClient } from "@/lib/supabase/client"
import { buildInternalSuperadminEmail, normalizeInternalUsername } from "@/lib/internal-auth"
import { readPortalSessionErrorMessage } from "@/lib/portal-session"
import type { Locale } from "@/lib/i18n"

function getSuperadminLoginCopy(locale: Locale) {
  if (locale === "en") {
    return {
      heroEyebrow: "Red Feng Superadmin",
      heroTitle: "Executive control portal for the highest-access holders at Red Feng.",
      heroBody:
        "This portal is dedicated to superadmins who oversee operations managers, finance managers, cross-team audits, and the health of internal systems.",
      bullets: [
        "Executive control over operations managers and finance managers",
        "Monitoring cross-team audits, backlog, and critical handoffs",
        "Creating manager accounts directly from the executive dashboard",
      ],
      footer: "Not a superadmin? Use the admin, finance, merchant, or customer portal based on your account role.",
      cardEyebrow: "Superadmin Login",
      cardTitle: "Sign in to superadmin dashboard",
      cardBody: "Use the internal superadmin username to enter the executive control center.",
      backHome: "Back to homepage",
      usernameLabel: "Superadmin username",
      usernamePlaceholder: "e.g. owner",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter superadmin password",
      submitIdle: "Enter superadmin dashboard",
      submitLoading: "Signing in...",
      noSession: "Your superadmin session has ended or was replaced. Please sign in again.",
      noProfile: "This account does not have a valid superadmin profile yet.",
      wrongPortalPrefix: "This portal only accepts superadmin accounts.",
      emptyFields: "Username and password are required.",
      invalidCredentials: "Invalid superadmin username or password.",
      wrongRole: "This portal is for superadmin only.",
    }
  }

  if (locale === "zh") {
    return {
      heroEyebrow: "Red Feng 超级管理员",
      heroTitle: "为 Red Feng 最高权限持有者提供的高级控制门户。",
      heroBody: "此门户专供监督运营经理、财务经理、跨团队审计以及内部系统健康状况的超级管理员使用。",
      bullets: ["对运营经理和财务经理的高级控制", "监控跨团队审计、待办积压和关键交接", "直接从高管后台创建经理账号"],
      footer: "不是超级管理员？请根据您的账号角色使用管理员、财务、商家或客户入口。",
      cardEyebrow: "超级管理员登录",
      cardTitle: "登录超级管理员后台",
      cardBody: "请使用内部超级管理员用户名进入高级控制中心。",
      backHome: "返回首页",
      usernameLabel: "超级管理员用户名",
      usernamePlaceholder: "例如：owner",
      passwordLabel: "密码",
      passwordPlaceholder: "输入超级管理员密码",
      submitIdle: "进入超级管理员后台",
      submitLoading: "登录中...",
      noSession: "您的超级管理员会话已结束或被替换，请重新登录。",
      noProfile: "此账号尚未拥有有效的超级管理员资料。",
      wrongPortalPrefix: "此门户仅接受超级管理员账号。",
      emptyFields: "用户名和密码为必填项。",
      invalidCredentials: "超级管理员用户名或密码无效。",
      wrongRole: "此入口仅限超级管理员使用。",
    }
  }

  return {
    heroEyebrow: "Red Feng Superadmin",
    heroTitle: "Executive control portal untuk pemegang akses tertinggi Red Feng.",
    heroBody:
      "Portal ini dikhususkan untuk superadmin yang mengawasi manager operasional, manager finance, audit lintas tim, dan kesehatan sistem internal.",
    bullets: [
      "Kontrol eksekutif atas manager operasional dan manager finance",
      "Monitoring audit lintas tim, backlog, dan handoff kritis",
      "Pembuatan akun manager langsung dari executive dashboard",
    ],
    footer: "Bukan superadmin? Gunakan portal admin, finance, merchant, atau customer sesuai peran akun Anda.",
    cardEyebrow: "Superadmin Login",
    cardTitle: "Masuk ke superadmin dashboard",
    cardBody: "Gunakan username superadmin internal untuk masuk ke executive control center.",
    backHome: "Kembali ke beranda",
    usernameLabel: "Username superadmin",
    usernamePlaceholder: "mis: owner",
    passwordLabel: "Password",
    passwordPlaceholder: "Masukkan password superadmin",
    submitIdle: "Masuk ke superadmin dashboard",
    submitLoading: "Memproses login...",
    noSession: "Sesi superadmin Anda sudah berakhir atau tergantikan. Silakan login lagi.",
    noProfile: "Akun ini belum memiliki profil superadmin yang valid.",
    wrongPortalPrefix: "Portal ini hanya menerima akun superadmin.",
    emptyFields: "Username dan password wajib diisi.",
    invalidCredentials: "Username atau password superadmin tidak valid.",
    wrongRole: "Portal ini khusus untuk superadmin.",
  }
}

export default function SuperadminLoginClient({ initialLocale }: { initialLocale: Locale }) {
  const supabase = createClient()
  const t = getSuperadminLoginCopy(initialLocale)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [systemError] = useState(() => {
    if (typeof window === "undefined") return ""
    return new URLSearchParams(window.location.search).get("error") || ""
  })
  const systemErrorMessage = readPortalSessionErrorMessage(systemError, {
    noSession: t.noSession,
    noProfile: t.noProfile,
    wrongPortalPrefix: t.wrongPortalPrefix,
  })

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
      email: buildInternalSuperadminEmail(normalizedUsername),
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

    if (profile?.role !== "superadmin") {
      setError(t.wrongRole)
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    window.location.assign("/superadmin/dashboard")
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f6f0e8_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-[36px] border border-orange-200/60 bg-white shadow-[0_32px_110px_rgba(146,64,14,0.16)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden bg-[linear-gradient(145deg,#431407_0%,#7c2d12_26%,#c2410c_62%,#fdba74_100%)] px-8 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
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
                  <label htmlFor="superadmin-username" className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {t.usernameLabel}
                  </label>
                  <input
                    id="superadmin-username"
                    type="text"
                    autoComplete="username"
                    className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder={t.usernamePlaceholder}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="superadmin-password" className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {t.passwordLabel}
                  </label>
                  <PasswordField
                    id="superadmin-password"
                    autoComplete="current-password"
                    className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 pr-28 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder={t.passwordPlaceholder}
                    value={password}
                    onChange={setPassword}
                  />
                </div>

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_42%,#fb923c_100%)] px-5 py-4 text-base font-semibold text-white shadow-[0_16px_36px_rgba(194,65,12,0.24)] transition hover:shadow-[0_20px_44px_rgba(194,65,12,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
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
