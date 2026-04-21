"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AuthLocaleDropdown from "@/app/components/AuthLocaleDropdown";
import { createClient } from "@/lib/supabase/client";
import { dictionaries, type Locale } from "@/lib/i18n";
import { ACTIVE_PORTAL_COOKIE, ACTIVE_PORTAL_MAX_AGE, CUSTOMER_PORTAL_DEFAULT_REDIRECT } from "@/lib/portal-context";
import { readLocaleFromCookie } from "@/lib/locale-client";

type AuthProvider = "google" | "facebook";
type Mode = "login" | "register";

const providerConfig: Array<{
  provider: AuthProvider;
  enabled: boolean;
  className: string;
}> = [
  {
    provider: "google",
    enabled: process.env.NEXT_PUBLIC_AUTH_ENABLE_GOOGLE !== "false",
    className:
      "flex w-full items-center justify-center gap-3 rounded-[20px] border border-[#ecd9c2] bg-white px-5 py-4 text-base font-semibold text-slate-900 shadow-[0_16px_36px_rgba(148,64,14,0.08)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-[#fffaf4] hover:shadow-[0_20px_44px_rgba(148,64,14,0.14)] disabled:cursor-not-allowed disabled:opacity-70",
  },
  {
    provider: "facebook",
    enabled: process.env.NEXT_PUBLIC_AUTH_ENABLE_FACEBOOK === "true",
    className:
      "flex w-full items-center justify-center gap-3 rounded-2xl border border-[#1877F2] bg-[#1877F2] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_30px_rgba(24,119,242,0.24)] transition hover:-translate-y-0.5 hover:bg-[#166fe5] hover:shadow-[0_18px_40px_rgba(24,119,242,0.3)] disabled:cursor-not-allowed disabled:opacity-70",
  },
];

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.4-.2-2H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.6 0 4.8-.9 6.4-2.5l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.7-1.7-5.5-4H3.3v2.5C4.9 19.8 8.2 22 12 22z"
      />
      <path
        fill="#4A90E2"
        d="M6.5 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.5H3.3C2.5 9 2 10.4 2 12s.5 3 1.3 4.5L6.5 14z"
      />
      <path
        fill="#FBBC05"
        d="M12 6c1.4 0 2.7.5 3.7 1.4l2.8-2.8C16.8 3 14.6 2 12 2 8.2 2 4.9 4.2 3.3 7.5L6.5 10c.8-2.3 3-4 5.5-4z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1c0 6 4.4 11 10.1 11.9v-8.4H7.1v-3.5h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 1-2 2v2.2h3.4l-.5 3.5h-2.9V24C19.6 23.1 24 18.1 24 12.1Z" />
    </svg>
  );
}

function getProviderIcon(provider: AuthProvider) {
  switch (provider) {
    case "google":
      return <GoogleIcon />;
    case "facebook":
      return <FacebookIcon />;
  }
}

function getLoginDictionary(locale: Locale) {
  return dictionaries[locale].login;
}

function getProviderLabel(provider: AuthProvider, t: ReturnType<typeof getLoginDictionary>) {
  switch (provider) {
    case "google":
      return t.continueWithGoogle;
    case "facebook":
      return t.continueWithFacebook;
  }
}

function getSafeNextFromLocation() {
  if (typeof window === "undefined") return CUSTOMER_PORTAL_DEFAULT_REDIRECT;
  const requestedNext = new URLSearchParams(window.location.search).get("next");
  return requestedNext && requestedNext.startsWith("/") ? requestedNext : CUSTOMER_PORTAL_DEFAULT_REDIRECT;
}

function getSafeErrorFromLocation() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("error") || "";
}

function rememberActivePortal(portal: "customer" | "merchant") {
  if (typeof document === "undefined") return;
  document.cookie = `${ACTIVE_PORTAL_COOKIE}=${portal}; Path=/; Max-Age=${ACTIVE_PORTAL_MAX_AGE}; SameSite=Lax`;
}

function getCustomerModeCopy(locale: Locale, mode: Mode) {
  if (locale === "en") {
    return mode === "login"
      ? {
          switchLabel: "Sign in",
          heroTitle: "Sign in to continue your trip planning.",
          heroCopy: "Access bookings, faster checkout, and your travel details from one customer account.",
          cardEyebrow: "Customer Sign In",
          cardTitle: "Welcome back",
          cardSubtitle: "Continue with Google or Facebook to open your Red Feng customer account.",
          helperTitle: "Customer account benefits",
          helperItems: [
            "Track your bookings in one dashboard",
            "Continue checkout without re-entering the same details",
            "Keep your trip history connected to one account",
          ],
          trustTitle: "The customer experience stays focused and separate from internal portals.",
          metrics: [
            {
              label: "Booking flow",
              value: "1x",
              description: "One customer account for checkout, dashboard, and travel history.",
            },
            {
              label: "Support",
              value: "24/7",
              description: "Customer history stays connected so the team can respond faster.",
            },
            {
              label: "Trust layer",
              value: "OTA",
              description: "The customer portal is separated from admin, finance, and merchant access.",
            },
          ],
          registerHint: "If a customer account does not exist yet, Red Feng will create a new account when you continue this registration flow.",
          forgotPassword: "Forgot password?",
          andLabel: "and",
        }
      : {
          switchLabel: "Register",
          heroTitle: "Create your customer account before checkout.",
          heroCopy: "Register once to make future bookings faster and keep all your travel activity in one place.",
          cardEyebrow: "Customer Register",
          cardTitle: "Create your account",
          cardSubtitle: "Use Google or Facebook to register a Red Feng customer account in a few seconds.",
          helperTitle: "Why register first",
          helperItems: [
            "Save your traveler identity for the next booking",
            "Keep payment and booking progress in one account",
            "Use one account across Red Feng customer pages",
          ],
          trustTitle: "The customer experience stays focused and separate from internal portals.",
          metrics: [
            {
              label: "Booking flow",
              value: "1x",
              description: "One customer account for checkout, dashboard, and travel history.",
            },
            {
              label: "Support",
              value: "24/7",
              description: "Customer history stays connected so the team can respond faster.",
            },
            {
              label: "Trust layer",
              value: "OTA",
              description: "The customer portal is separated from admin, finance, and merchant access.",
            },
          ],
          registerHint: "If a customer account does not exist yet, Red Feng will create a new account when you continue this registration flow.",
          forgotPassword: "Forgot password?",
          andLabel: "and",
        };
  }

  if (locale === "zh") {
    return mode === "login"
      ? {
          switchLabel: "登录",
          heroTitle: "登录后继续规划您的旅程。",
          heroCopy: "使用一个客户账号查看订单、更快结账，并统一管理您的出行资料。",
          cardEyebrow: "客户登录",
          cardTitle: "欢迎回来",
          cardSubtitle: "使用 Google 或 Facebook 继续登录您的 Red Feng 客户账号。",
          helperTitle: "客户账号权益",
          helperItems: [
            "在一个面板中查看所有订单",
            "结账时无需重复填写相同信息",
            "将您的出行记录保存在同一个账号中",
          ],
          trustTitle: "客户体验将保持专注，不会与内部门户混在一起。",
          metrics: [
            {
              label: "预订流程",
              value: "1x",
              description: "一个客户账号即可用于结账、后台和行程历史。",
            },
            {
              label: "支持",
              value: "24/7",
              description: "客户历史会持续保留，方便团队更快响应需求。",
            },
            {
              label: "信任层",
              value: "OTA",
              description: "客户门户与管理员、财务和商家入口分离。",
            },
          ],
          registerHint: "如果客户账号尚不存在，您继续此注册流程时 Red Feng 会自动创建新账号。",
          forgotPassword: "忘记密码？",
          andLabel: "和",
        }
      : {
          switchLabel: "注册",
          heroTitle: "请在结账前先创建您的客户账号。",
          heroCopy: "注册一次，即可让下一次预订更快，并将所有出行活动保存在同一个地方。",
          cardEyebrow: "客户注册",
          cardTitle: "创建账号",
          cardSubtitle: "使用 Google 或 Facebook，几秒钟内注册 Red Feng 客户账号。",
          helperTitle: "为什么先注册",
          helperItems: [
            "保存旅客资料，方便下次预订",
            "把付款和订单进度集中在一个账号中",
            "在 Red Feng 客户页面使用同一个账号",
          ],
          trustTitle: "客户体验将保持专注，不会与内部门户混在一起。",
          metrics: [
            {
              label: "预订流程",
              value: "1x",
              description: "一个客户账号即可用于结账、后台和行程历史。",
            },
            {
              label: "支持",
              value: "24/7",
              description: "客户历史会持续保留，方便团队更快响应需求。",
            },
            {
              label: "信任层",
              value: "OTA",
              description: "客户门户与管理员、财务和商家入口分离。",
            },
          ],
          registerHint: "如果客户账号尚不存在，您继续此注册流程时 Red Feng 会自动创建新账号。",
          forgotPassword: "忘记密码？",
          andLabel: "和",
        };
  }

  return mode === "login"
    ? {
        switchLabel: "Masuk",
        heroTitle: "Masuk untuk melanjutkan rencana perjalanan Anda.",
        heroCopy: "Akses booking, checkout lebih cepat, dan detail perjalanan dari satu akun customer.",
        cardEyebrow: "Customer Login",
        cardTitle: "Selamat datang kembali",
        cardSubtitle: "Lanjutkan dengan Google atau Facebook untuk membuka akun customer Red Feng Anda.",
        helperTitle: "Keuntungan akun customer",
        helperItems: [
          "Pantau semua booking dalam satu dashboard",
          "Checkout lebih cepat tanpa isi data berulang",
          "Riwayat perjalanan tetap tersimpan di satu akun",
        ],
        trustTitle: "Pengalaman customer dibuat lebih fokus dan tidak bercampur dengan portal internal.",
        metrics: [
          {
            label: "Booking flow",
            value: "1x",
            description: "Satu akun customer untuk checkout, dashboard, dan riwayat perjalanan.",
          },
          {
            label: "Support",
            value: "24/7",
            description: "Riwayat customer tersimpan agar tim dapat menangani permintaan lebih cepat.",
          },
          {
            label: "Trust layer",
            value: "OTA",
            description: "Portal customer dipisahkan dari admin, finance, dan merchant agar alurnya tetap bersih.",
          },
        ],
        registerHint: "Jika akun customer belum ada, Red Feng akan membuat akun baru saat Anda melanjutkan proses daftar ini.",
        forgotPassword: "Lupa password?",
        andLabel: "dan",
      }
    : {
        switchLabel: "Daftar",
        heroTitle: "Buat akun customer sebelum checkout.",
        heroCopy: "Daftar sekali untuk mempercepat booking berikutnya dan menyimpan seluruh aktivitas perjalanan Anda di satu tempat.",
        cardEyebrow: "Customer Register",
        cardTitle: "Buat akun Anda",
        cardSubtitle: "Gunakan Google atau Facebook untuk mendaftarkan akun customer Red Feng dalam beberapa detik.",
        helperTitle: "Kenapa daftar dulu",
        helperItems: [
          "Simpan identitas traveler untuk booking berikutnya",
          "Satukan progress pembayaran dan booking dalam satu akun",
          "Pakai satu akun customer di seluruh halaman Red Feng",
        ],
        trustTitle: "Pengalaman customer dibuat lebih fokus dan tidak bercampur dengan portal internal.",
        metrics: [
          {
            label: "Booking flow",
            value: "1x",
            description: "Satu akun customer untuk checkout, dashboard, dan riwayat perjalanan.",
          },
          {
            label: "Support",
            value: "24/7",
            description: "Riwayat customer tersimpan agar tim dapat menangani permintaan lebih cepat.",
          },
          {
            label: "Trust layer",
            value: "OTA",
            description: "Portal customer dipisahkan dari admin, finance, dan merchant agar alurnya tetap bersih.",
          },
        ],
        registerHint: "Jika akun customer belum ada, Red Feng akan membuat akun baru saat Anda melanjutkan proses daftar ini.",
        forgotPassword: "Lupa password?",
        andLabel: "dan",
      };
}

export default function CustomerAuthPanel({ mode, initialLocale }: { mode: Mode; initialLocale: Locale }) {
  const supabase = createClient("customer");
  const [locale] = useState<Locale>(() => initialLocale || readLocaleFromCookie());
  const [safeNext] = useState(getSafeNextFromLocation);
  const [searchError] = useState(getSafeErrorFromLocation);
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const enabledProviders = providerConfig.filter((item) => item.enabled);

  const t = getLoginDictionary(locale);
  const modeCopy = getCustomerModeCopy(locale, mode);
  const footerHref = mode === "login" ? "/register" : "/login";
  const footerLead = mode === "login" ? t.registerCta : t.loginCta;
  const footerLabel = mode === "login" ? t.registerLink : t.loginLink;
  const authError = errorMsg || searchError;
  const modeTabs = useMemo(
    () => [
      {
        href: `/login${safeNext !== CUSTOMER_PORTAL_DEFAULT_REDIRECT ? `?next=${encodeURIComponent(safeNext)}` : ""}`,
        label:
          modeCopy.switchLabel === "Masuk" || modeCopy.switchLabel === "Sign in" || modeCopy.switchLabel === "登录"
            ? modeCopy.switchLabel
            : t.loginLink,
        active: mode === "login",
      },
      {
        href: `/register${safeNext !== CUSTOMER_PORTAL_DEFAULT_REDIRECT ? `?next=${encodeURIComponent(safeNext)}` : ""}`,
        label: mode === "register" ? modeCopy.switchLabel : t.registerLink,
        active: mode === "register",
      },
    ],
    [mode, modeCopy.switchLabel, safeNext, t.loginLink, t.registerLink],
  );
  const trustItems = modeCopy.helperItems;

  const handleProviderAuth = async (provider: AuthProvider) => {
    setLoadingProvider(provider);
    setErrorMsg("");
    rememberActivePortal("customer");

    const redirectTo =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/auth/callback?portal=customer&next=${encodeURIComponent(safeNext)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoadingProvider(null);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f6f0e8_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(124,45,18,0.1),transparent_24%)]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-[36px] border border-orange-200/60 bg-white shadow-[0_32px_110px_rgba(146,64,14,0.16)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden bg-[linear-gradient(145deg,#7c2d12_0%,#c2410c_36%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_30%)]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-50/80">
                  Red Feng Customer
                </p>
                <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight md:text-5xl">
                  {modeCopy.heroTitle}
                </h2>
              </div>
              <div className="hidden rounded-[24px] border border-white/20 bg-white/10 px-5 py-4 backdrop-blur md:block">
                <div className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Customer Portal</div>
                <div className="mt-2 text-2xl font-semibold">{modeCopy.switchLabel}</div>
              </div>
            </div>

            <p className="mt-8 max-w-2xl text-base leading-8 text-orange-50/92 sm:text-lg">
              {modeCopy.heroCopy}
            </p>

            <div className="relative mt-10 grid gap-4 xl:grid-cols-3">
              {modeCopy.metrics.map((metric) => (
                <div key={metric.label} className="rounded-[28px] border border-white/20 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.22em] text-orange-50/70">{metric.label}</p>
                  <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
                  <p className="mt-2 text-sm text-orange-50/85">{metric.description}</p>
                </div>
              ))}
            </div>

            <div className="relative mt-auto pt-10">
              <div className="rounded-[30px] border border-white/18 bg-slate-950/16 p-6 backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.34em] text-orange-100/80">
                      {modeCopy.helperTitle}
                    </p>
                    <p className="mt-2 text-xl font-semibold">{modeCopy.trustTitle}</p>
                  </div>
                  <div className="grid h-20 w-20 place-items-center rounded-[26px] border border-white/20 bg-white/12 text-center text-sm font-semibold leading-tight text-white">
                    Red
                    <br />
                    Feng
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {trustItems.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm text-orange-50/90"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-orange-700">
                        *
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f1_100%)] px-6 py-10 sm:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-xl">
            <div className="rounded-[32px] border border-orange-100 bg-white p-8 shadow-[0_24px_70px_rgba(148,64,14,0.08)] sm:p-10">
              <div className="mb-4 flex justify-end">
                <AuthLocaleDropdown locale={locale} />
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-orange-100 bg-[#fff8f1] p-2">
                {modeTabs.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`inline-flex flex-1 items-center justify-center rounded-[16px] px-4 py-3 text-sm font-semibold transition ${
                      tab.active
                        ? "bg-white text-orange-700 shadow-[0_10px_24px_rgba(148,64,14,0.08)]"
                        : "text-slate-600 hover:bg-white hover:text-orange-700"
                    }`}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>

              <div className="mt-6 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-orange-700">
                {modeCopy.cardEyebrow}
              </div>
              <h1 className="mt-5 text-3xl font-semibold leading-tight text-slate-950">{modeCopy.cardTitle}</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">{modeCopy.cardSubtitle}</p>

              <div className="mt-8 space-y-3">
                {enabledProviders.map((item) => (
                  <button
                    key={item.provider}
                    type="button"
                    onClick={() => handleProviderAuth(item.provider)}
                    disabled={loadingProvider !== null}
                    className={item.className}
                  >
                    {getProviderIcon(item.provider)}
                    <span>
                      {loadingProvider === item.provider ? t.processing : getProviderLabel(item.provider, t)}
                    </span>
                  </button>
                ))}
              </div>

              <div className="my-7 flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                <span>{t.otherOptions}</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="rounded-[24px] border border-orange-100 bg-[linear-gradient(180deg,#fff9f2_0%,#fffdf9_100%)] px-5 py-4 text-sm leading-7 text-slate-600">
                {mode === "login" ? t.autoCreateHint : modeCopy.registerHint}
              </div>

              {authError ? (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {authError}
                </div>
              ) : null}

              {mode === "login" ? (
                <div className="mt-5">
                  <Link
                    href="/forgot-password?next=/login"
                    className="text-sm font-medium text-orange-700 hover:text-orange-800"
                  >
                    {modeCopy.forgotPassword}
                  </Link>
                </div>
              ) : null}

              <p className="mt-6 text-xs leading-6 text-slate-500">
                {t.termsLead}{" "}
                <Link href="/terms" className="font-semibold text-orange-700 hover:text-orange-800">
                  {t.terms}
                </Link>{" "}
                {modeCopy.andLabel}{" "}
                <Link href="/privacy" className="font-semibold text-orange-700 hover:text-orange-800">
                  {t.privacy}
                </Link>
                .
              </p>

              <p className="mt-6 text-sm text-slate-600">
                {footerLead}{" "}
                <Link href={footerHref} className="font-semibold text-orange-600 hover:text-orange-700">
                  {footerLabel}
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
