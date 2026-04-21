'use client'

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import PasswordField from "@/app/components/PasswordField"
import AuthLocaleDropdown from "@/app/components/AuthLocaleDropdown"
import { createClient } from "@/lib/supabase/client"
import type { Locale } from "@/lib/i18n"

function getMerchantRegisterCopy(locale: Locale) {
  if (locale === "en") {
    return {
      eyebrow: "Red Feng Merchant",
      heroTitle: "Join the digital travel ecosystem with a cleaner onboarding flow.",
      heroBody:
        "Create a merchant account to continue business onboarding, complete legal data, upload documents, and enter admin review in one more professional flow.",
      journeyEyebrow: "Merchant Access",
      journeyTitle: "Professional setup for travel partners",
      beforeReview: "Before review",
      beforeReviewFooter: "Already have a merchant account? Sign in to continue the partner flow.",
      cardEyebrow: "Merchant Register",
      cardTitle: "Create a new partner account",
      cardBody:
        "This step creates your initial merchant account. After that, you will be directed to business onboarding to complete your data before entering the admin team.",
      backHome: "Back to homepage",
      readyTitle: "Ready for merchant onboarding",
      readyBody: "Use an active business email so verification and admin approval communication stays organized.",
      emailLabel: "Business email",
      defaultLanguageLabel: "Default merchant language",
      defaultLanguageHint: "This language will be used as the default language for merchant email communication from the admin system.",
      passwordLabel: "Password",
      passwordPlaceholder: "Minimum 8 characters",
      submitIdle: "Continue to merchant onboarding",
      submitLoading: "Creating account...",
      onboardingNote: "Onboarding notes",
      notes: [
        "Initial merchant data will be created as a draft.",
        "A new merchant appears to admin only after onboarding and document upload are completed.",
        "Make sure your email stays active for verification and approval notifications.",
      ],
      checkpoints: [
        "Create merchant account first",
        "Complete business and legal identity",
        "Upload documents to enter admin review",
      ],
      highlights: [
        {
          title: "Verified merchant dashboard",
          description: "Manage inventory, pricing, documents, and verification status from one workspace.",
          icon: "01",
        },
        {
          title: "Step-by-step onboarding",
          description: "Follow a short and structured flow before the data enters the admin review team.",
          icon: "02",
        },
        {
          title: "Cleaner admin review",
          description: "Once onboarding is complete, the merchant enters the internal approval queue directly.",
          icon: "03",
        },
      ],
      missingFields: "Email and password are required.",
      alreadyRegistered: "This email is already registered. Use the same password to continue onboarding, or reset your password if you forgot it.",
      restoreFailed: "Merchant draft could not be restored. Please try again.",
      createUserFailed: "Merchant user could not be created. Please try again.",
      bootstrapFailed: "Merchant bootstrap could not be created.",
    }
  }

  if (locale === "zh") {
    return {
      eyebrow: "Red Feng 商家",
      heroTitle: "加入数字旅游生态，使用更清晰的入驻流程。",
      heroBody: "创建商家账号后，您可以继续企业入驻、填写法律资料、上传文件，并在一个更专业的流程中进入管理员审核。",
      journeyEyebrow: "商家入口",
      journeyTitle: "为旅游合作伙伴打造的专业配置",
      beforeReview: "审核前",
      beforeReviewFooter: "已经有商家账号？登录合作伙伴区域以继续入驻流程。",
      cardEyebrow: "商家注册",
      cardTitle: "创建新的合作伙伴账号",
      cardBody: "此步骤会创建初始商家账号。之后您将进入企业入驻流程，在进入管理员团队前补全资料。",
      backHome: "返回首页",
      readyTitle: "准备开始商家入驻",
      readyBody: "请使用有效的企业邮箱，便于保持验证和管理员审批沟通有序。",
      emailLabel: "企业邮箱",
      defaultLanguageLabel: "商家默认语言",
      defaultLanguageHint: "该语言将作为管理员系统向商家发送邮件沟通时的默认语言。",
      passwordLabel: "密码",
      passwordPlaceholder: "至少 8 个字符",
      submitIdle: "继续商家入驻",
      submitLoading: "创建账号中...",
      onboardingNote: "入驻说明",
      notes: [
        "初始商家资料会先保存为草稿。",
        "只有在完成入驻和上传文件后，新商家才会显示给管理员。",
        "请确保邮箱保持可用，以接收验证和审批通知。",
      ],
      checkpoints: ["先创建商家账号", "完善企业与法律身份信息", "上传文件进入管理员审核"],
      highlights: [
        {
          title: "已验证商家后台",
          description: "在一个工作台中管理库存、价格、文件和审核状态。",
          icon: "01",
        },
        {
          title: "分步骤入驻",
          description: "在数据进入管理员审核团队之前，按简短且结构化的流程完成操作。",
          icon: "02",
        },
        {
          title: "更整洁的管理员审核",
          description: "完成入驻后，商家将直接进入内部审批队列。",
          icon: "03",
        },
      ],
      missingFields: "邮箱和密码为必填项。",
      alreadyRegistered: "该邮箱已注册。请使用相同密码继续入驻流程，或在忘记密码时重置密码。",
      restoreFailed: "无法恢复商家草稿，请重试。",
      createUserFailed: "无法创建商家用户，请重试。",
      bootstrapFailed: "无法创建商家引导数据。",
    }
  }

  return {
    eyebrow: "Red Feng Merchant",
    heroTitle: "Join The Digital Travel Ecosystem dengan onboarding yang lebih rapi.",
    heroBody:
      "Buat akun merchant untuk melanjutkan onboarding bisnis, pengisian data legal, dokumen, dan review admin dalam satu alur yang lebih profesional.",
    journeyEyebrow: "Merchant Access",
    journeyTitle: "Professional setup for travel partners",
    beforeReview: "Before review",
    beforeReviewFooter: "Sudah punya akun merchant? Masuk ke area partner untuk melanjutkan proses onboarding.",
    cardEyebrow: "Merchant Register",
    cardTitle: "Buat akun partner baru",
    cardBody:
      "Langkah ini membuat akun merchant awal. Setelah itu Anda akan diarahkan ke onboarding bisnis untuk melengkapi data sebelum masuk ke tim admin.",
    backHome: "Kembali ke beranda",
    readyTitle: "Siap untuk onboarding merchant",
    readyBody: "Gunakan email bisnis aktif agar komunikasi verifikasi dan approval admin tetap rapi.",
    emailLabel: "Email bisnis",
    defaultLanguageLabel: "Bahasa default merchant",
    defaultLanguageHint: "Bahasa ini akan dipakai sebagai bahasa default komunikasi email merchant dari sistem admin.",
    passwordLabel: "Password",
    passwordPlaceholder: "Minimal 8 karakter",
    submitIdle: "Lanjut ke onboarding merchant",
    submitLoading: "Membuat akun...",
    onboardingNote: "Catatan onboarding",
    notes: [
      "Data awal merchant akan dibuat sebagai draft.",
      "Merchant baru tampil ke admin setelah onboarding dan upload dokumen selesai.",
      "Pastikan email aktif untuk notifikasi verifikasi dan approval.",
    ],
    checkpoints: [
      "Akun merchant dibuat lebih dulu",
      "Lengkapi identitas bisnis dan legal",
      "Upload dokumen untuk masuk review admin",
    ],
    highlights: [
      {
        title: "Merchant dashboard terverifikasi",
        description: "Kelola inventori, harga, dokumen, dan status verifikasi dari satu workspace.",
        icon: "01",
      },
      {
        title: "Onboarding bertahap",
        description: "Ikuti alur singkat dan terstruktur sebelum data masuk ke tim admin review.",
        icon: "02",
      },
      {
        title: "Review admin lebih rapi",
        description: "Setelah onboarding selesai, merchant langsung masuk ke antrian approval internal.",
        icon: "03",
      },
    ],
    missingFields: "Email dan password wajib diisi.",
    alreadyRegistered: "Email sudah terdaftar. Gunakan password yang sama untuk melanjutkan onboarding, atau reset password jika lupa.",
    restoreFailed: "Merchant draft gagal dipulihkan. Coba ulangi.",
    createUserFailed: "User merchant gagal dibuat. Coba ulangi.",
    bootstrapFailed: "Merchant bootstrap gagal dibuat.",
  }
}

const languageOptions: Array<{ value: Locale; label: string }> = [
  { value: "id", label: "Bahasa Indonesia" },
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
]

export default function MerchantRegisterClient({ initialLocale }: { initialLocale: Locale }) {
  const supabase = createClient("merchant")
  const router = useRouter()
  const t = getMerchantRegisterCopy(initialLocale)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [defaultLocale, setDefaultLocale] = useState<Locale>(initialLocale)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleRegister = async () => {
    setLoading(true)
    setErrorMsg("")

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) {
      setErrorMsg(t.missingFields)
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    })

    if (error) {
      const isAlreadyRegistered = error.message.toLowerCase().includes("already registered")

      if (!isAlreadyRegistered) {
        setErrorMsg(error.message)
        setLoading(false)
        return
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (signInError || !signInData.user) {
        setErrorMsg(t.alreadyRegistered)
        setLoading(false)
        return
      }

      const resumeBootstrapResponse = await fetch("/api/merchant/register/bootstrap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: signInData.user.id,
          email: normalizedEmail,
          defaultLocale,
        }),
      })

      const resumeBootstrapPayload = (await resumeBootstrapResponse.json()) as { error?: string }

      if (!resumeBootstrapResponse.ok) {
        setErrorMsg(resumeBootstrapPayload.error || t.restoreFailed)
        setLoading(false)
        return
      }

      router.push("/merchant/onboarding")
      setLoading(false)
      return
    }

    const user = data.user
    if (!user) {
      setErrorMsg(t.createUserFailed)
      setLoading(false)
      return
    }

    const bootstrapResponse = await fetch("/api/merchant/register/bootstrap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user.id,
        email: normalizedEmail,
        defaultLocale,
      }),
    })

    const bootstrapPayload = (await bootstrapResponse.json()) as { error?: string }

    if (!bootstrapResponse.ok) {
      setErrorMsg(bootstrapPayload.error || t.bootstrapFailed)
      setLoading(false)
      return
    }

    router.push("/merchant/onboarding")
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7f0_0%,#f7f2ea_35%,#f3efe8_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl overflow-hidden rounded-[36px] border border-orange-200/60 bg-white shadow-[0_36px_120px_rgba(146,64,14,0.16)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative overflow-hidden bg-[linear-gradient(145deg,#7c2d12_0%,#c2410c_36%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_30%)]" />
          <div className="absolute -left-24 top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-amber-200/15 blur-3xl" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.38em] text-orange-100/90">{t.eyebrow}</p>
                <h1 className="mt-3 max-w-lg text-4xl font-semibold leading-tight sm:text-5xl">{t.heroTitle}</h1>
              </div>
              <div className="hidden rounded-[24px] border border-white/20 bg-white/10 px-5 py-4 backdrop-blur md:block">
                <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">{t.journeyEyebrow}</p>
                <p className="mt-2 text-sm font-medium text-white/90">{t.journeyTitle}</p>
              </div>
            </div>

            <p className="relative mt-8 max-w-2xl text-base leading-8 text-orange-50/92 sm:text-lg">{t.heroBody}</p>

            <div className="relative mt-10 grid gap-4 xl:grid-cols-3">
              {t.highlights.map((item) => (
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
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-orange-100/80">{t.beforeReview}</p>
                <div className="mt-5 space-y-4">
                  {t.checkpoints.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-amber-100">
                        •
                      </span>
                      <p className="text-sm leading-7 text-orange-50/90">{item}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-sm leading-7 text-orange-100/80">{t.beforeReviewFooter}</p>
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
                    href="https://redfeng.co/"
                    className="inline-flex items-center gap-2 text-sm font-medium text-orange-700 transition hover:text-orange-800"
                  >
                    {t.backHome}
                    <span aria-hidden="true">-&gt;</span>
                  </Link>
                </div>
              </div>

              <div className="mt-8 rounded-[24px] border border-orange-100 bg-gradient-to-r from-orange-50 via-white to-amber-50 p-5">
                <p className="text-sm font-semibold text-slate-900">{t.readyTitle}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{t.readyBody}</p>
              </div>

              <div className="mt-8 space-y-6">
                <div className="space-y-3">
                  <label htmlFor="merchant-email" className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {t.emailLabel}
                  </label>
                  <input
                    id="merchant-email"
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="hello@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label
                    htmlFor="merchant-default-language"
                    className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500"
                  >
                    {t.defaultLanguageLabel}
                  </label>
                  <select
                    id="merchant-default-language"
                    value={defaultLocale}
                    onChange={(e) => setDefaultLocale(e.target.value as Locale)}
                    className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 text-base text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm leading-7 text-slate-500">{t.defaultLanguageHint}</p>
                </div>

                <div className="space-y-3">
                  <label htmlFor="merchant-password" className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {t.passwordLabel}
                  </label>
                  <PasswordField
                    id="merchant-password"
                    autoComplete="new-password"
                    className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 pr-28 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder={t.passwordPlaceholder}
                    value={password}
                    onChange={setPassword}
                  />
                </div>

                {errorMsg ? (
                  <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
                ) : null}

                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_42%,#fb923c_100%)] px-5 py-4 text-base font-semibold text-white shadow-[0_16px_36px_rgba(194,65,12,0.24)] transition hover:shadow-[0_20px_44px_rgba(194,65,12,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? t.submitLoading : t.submitIdle}
                  <span aria-hidden="true">-&gt;</span>
                </button>
              </div>

              <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{t.onboardingNote}</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  {t.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
