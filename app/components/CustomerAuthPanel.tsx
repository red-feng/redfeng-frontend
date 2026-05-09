"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Locale } from "@/lib/i18n";
import {
  ACTIVE_PORTAL_COOKIE,
  ACTIVE_PORTAL_MAX_AGE,
  CUSTOMER_PORTAL_DEFAULT_REDIRECT,
} from "@/lib/portal-context";
import { readLocaleFromCookie } from "@/lib/locale-client";

type AuthProvider = "google" | "facebook";
type Mode = "login" | "register";

const providerConfig: Array<{
  provider: AuthProvider;
  enabled: boolean;
}> = [
  {
    provider: "google",
    enabled: process.env.NEXT_PUBLIC_AUTH_ENABLE_GOOGLE !== "false",
  },
  {
    provider: "facebook",
    enabled: process.env.NEXT_PUBLIC_AUTH_ENABLE_FACEBOOK === "true",
  },
];

const localeOptions: Array<{ value: Locale; label: string }> = [
  { value: "id", label: "ID" },
  { value: "en", label: "EN" },
  { value: "zh", label: "ZH" },
];

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

function GlobeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M12 2.75a9.25 9.25 0 1 0 0 18.5a9.25 9.25 0 0 0 0-18.5Zm6.92 8.5h-3.06a15.43 15.43 0 0 0-1.38-5.03a7.78 7.78 0 0 1 4.44 5.03Zm-6.17-5.86c.84 1.08 1.48 3.08 1.67 5.86h-4.84c.19-2.78.83-4.78 1.67-5.86A2.3 2.3 0 0 1 12 4.7c.29 0 .55.15.75.69Zm-4.23.83a15.42 15.42 0 0 0-1.38 5.03H4.08a7.78 7.78 0 0 1 4.44-5.03Zm-4.44 6.53h3.06c.09 1.79.52 3.56 1.38 5.03a7.78 7.78 0 0 1-4.44-5.03Zm5.42 0h4.99c-.19 2.79-.83 4.78-1.67 5.86c-.2.54-.46.69-.75.69s-.55-.15-.75-.69c-.84-1.08-1.48-3.07-1.67-5.86Zm0-1.5c.19-2.79.83-4.78 1.67-5.86c.2-.54.46-.69.75-.69s.55.15.75.69c.84 1.08 1.48 3.07 1.67 5.86H9.5Zm4.98 6.53c.86-1.47 1.29-3.24 1.38-5.03h3.06a7.78 7.78 0 0 1-4.44 5.03Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
      <path
        d="M5.47 7.97a.75.75 0 0 1 1.06 0L10 11.44l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
      <path
        d="M16.16 5.47a.75.75 0 0 1 0 1.06l-7 7a.75.75 0 0 1-1.06 0l-3.25-3.25a.75.75 0 0 1 1.06-1.06l2.72 2.72l6.47-6.47a.75.75 0 0 1 1.06 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M12 12.75a4.5 4.5 0 1 0-4.5-4.5a4.5 4.5 0 0 0 4.5 4.5Zm0 1.5c-3.6 0-6.75 1.84-6.75 4.25c0 .41.34.75.75.75h12c.41 0 .75-.34.75-.75c0-2.41-3.15-4.25-6.75-4.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M7.75 10V8.75a4.25 4.25 0 1 1 8.5 0V10h.5A2.25 2.25 0 0 1 19 12.25v6.5A2.25 2.25 0 0 1 16.75 21h-9.5A2.25 2.25 0 0 1 5 18.75v-6.5A2.25 2.25 0 0 1 7.25 10h.5Zm1.5 0h5.5V8.75a2.75 2.75 0 1 0-5.5 0V10Zm2.75 2.25a1.75 1.75 0 0 0-.75 3.33v1.17a.75.75 0 0 0 1.5 0v-1.17A1.75 1.75 0 0 0 12 12.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M12 5.5c5.07 0 8.5 4.64 9.43 6.06a.8.8 0 0 1 0 .88C20.5 13.86 17.07 18.5 12 18.5S3.5 13.86 2.57 12.44a.8.8 0 0 1 0-.88C3.5 10.14 6.93 5.5 12 5.5Zm0 1.5c-3.86 0-6.7 3.39-7.88 5c1.18 1.61 4.02 5 7.88 5s6.7-3.39 7.88-5c-1.18-1.61-4.02-5-7.88-5Zm0 2a3 3 0 1 1 0 6a3 3 0 0 1 0-6Zm0 1.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
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

function AppleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
      <path
        d="M15.15 3c0 1.22-.47 2.18-1.07 2.89c-.64.76-1.7 1.34-2.76 1.25c-.13-1.13.34-2.17.94-2.87C12.9 3.5 14 3.01 15.15 3Zm4.05 14.08c-.47 1.08-.7 1.56-1.3 2.53c-.84 1.36-2.02 3.06-3.48 3.07c-1.29.01-1.62-.85-3.36-.84c-1.74.01-2.1.86-3.39.85c-1.46-.02-2.58-1.55-3.42-2.91C1.88 17.7 1 14.83 1.88 12.24c.62-1.86 2.18-3.03 3.64-3.03c1.49 0 2.43.86 3.66.86c1.2 0 1.94-.86 3.65-.86c1.3 0 2.69.71 3.59 1.95c-3.21 1.76-2.69 6.33 2.78 5.92Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
      <path
        d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1c0 6 4.4 11 10.1 11.9v-8.4H7.1v-3.5h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 1-2 2v2.2h3.4l-.5 3.5h-2.9V24C19.6 23.1 24 18.1 24 12.1Z"
        fill="#1877F2"
      />
    </svg>
  );
}

function getProviderIcon(provider: AuthProvider | "apple") {
  if (provider === "google") return <GoogleIcon />;
  if (provider === "facebook") return <FacebookIcon />;
  return <AppleIcon />;
}

function getLocaleCopy(locale: Locale) {
  if (locale === "en") {
    return {
      heroTagline: "Find the best travel packages for unforgettable trips.",
      welcome: "Welcome Back!",
      subtitle: "Sign in to continue your journey with RedFeng",
      loginTab: "Sign In",
      registerTab: "Register",
      emailPlaceholder: "Email or mobile number",
      passwordPlaceholder: "Password",
      forgotPassword: "Forgot password?",
      primaryLogin: "Sign In",
      primaryRegister: "Register",
      divider: "or continue with",
      chooseProvider: "Choose one of the sign-in methods below.",
      disabledProvider: "Coming soon",
      continueWithGoogle: "Continue with Google",
      continueWithApple: "Continue with Apple",
      continueWithFacebook: "Continue with Facebook",
      processing: "Processing...",
      termsLead: "By continuing, you agree to our",
      terms: "Terms & Conditions",
      privacy: "Privacy Policy",
      noAccount: "Don't have an account yet?",
      registerNow: "Register now",
      haveAccount: "Already have an account?",
      loginNow: "Sign in now",
      leftFeatures: [
        {
          title: "Best travel packages",
          description: "Thousands of domestic and international travel options.",
        },
        {
          title: "Safe and trusted",
          description: "Secure transactions and 24/7 customer support.",
        },
        {
          title: "Easy and practical",
          description: "Book anytime and anywhere with a smoother flow.",
        },
      ],
    };
  }

  if (locale === "zh") {
    return {
      heroTagline: "发现最优质的旅游套餐，开启难忘旅程。",
      welcome: "欢迎回来！",
      subtitle: "登录以继续您与 RedFeng 的旅程",
      loginTab: "登录",
      registerTab: "注册",
      emailPlaceholder: "邮箱或手机号",
      passwordPlaceholder: "密码",
      forgotPassword: "忘记密码？",
      primaryLogin: "登录",
      primaryRegister: "注册",
      divider: "或使用以下方式登录",
      chooseProvider: "请选择下方可用的登录方式。",
      disabledProvider: "即将推出",
      continueWithGoogle: "使用 Google 继续",
      continueWithApple: "使用 Apple 继续",
      continueWithFacebook: "使用 Facebook 继续",
      processing: "处理中...",
      termsLead: "继续即表示您同意我们的",
      terms: "条款与条件",
      privacy: "隐私政策",
      noAccount: "还没有账户？",
      registerNow: "立即注册",
      haveAccount: "已经有账户？",
      loginNow: "立即登录",
      leftFeatures: [
        {
          title: "优选旅游套餐",
          description: "海量国内与国际旅游套餐任您挑选",
        },
        {
          title: "安全且值得信赖",
          description: "安全交易体验与 24/7 客户支持",
        },
        {
          title: "简单又便捷",
          description: "随时随地轻松预订，流程更顺畅",
        },
      ],
    };
  }

  return {
    heroTagline: "Temukan paket wisata terbaik untuk perjalanan tak terlupakan.",
    welcome: "Selamat Datang!",
    subtitle: "Masuk untuk melanjutkan perjalananmu bersama RedFeng",
    loginTab: "Masuk",
    registerTab: "Daftar",
    emailPlaceholder: "Email atau Nomor Handphone",
    passwordPlaceholder: "Kata Sandi",
    forgotPassword: "Lupa Kata Sandi?",
    primaryLogin: "Masuk",
    primaryRegister: "Daftar",
    divider: "atau masuk dengan",
    chooseProvider: "Pilih metode masuk yang tersedia di bawah.",
    disabledProvider: "Segera hadir",
    continueWithGoogle: "Lanjutkan dengan Google",
    continueWithApple: "Lanjutkan dengan Apple",
    continueWithFacebook: "Lanjutkan dengan Facebook",
    processing: "Memproses...",
    termsLead: "Dengan melanjutkan, Anda menyetujui",
    terms: "Syarat & Ketentuan",
    privacy: "Kebijakan Privasi",
    noAccount: "Belum punya akun?",
    registerNow: "Daftar sekarang",
    haveAccount: "Sudah punya akun?",
    loginNow: "Masuk sekarang",
    leftFeatures: [
      {
        title: "Paket Wisata Terbaik",
        description: "Ribuan pilihan paket wisata domestik dan internasional",
      },
      {
        title: "Aman & Terpercaya",
        description: "Transaksi aman dan dukungan customer 24/7",
      },
      {
        title: "Mudah & Praktis",
        description: "Pesan kapan saja, di mana saja dengan mudah",
      },
    ],
  };
}

async function updateLocale(nextLocale: Locale) {
  const response = await fetch("/api/locale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale: nextLocale }),
  });

  if (!response.ok) return;
  window.location.reload();
}

export default function CustomerAuthPanel({ mode, initialLocale }: { mode: Mode; initialLocale: Locale }) {
  const supabase = createClient("customer");
  const [locale] = useState<Locale>(() => initialLocale || readLocaleFromCookie());
  const [safeNext] = useState(getSafeNextFromLocation);
  const [searchError] = useState(getSafeErrorFromLocation);
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [emailVisual, setEmailVisual] = useState("");
  const [passwordVisual, setPasswordVisual] = useState("");
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false);
  const enabledProviders = providerConfig.filter((item) => item.enabled);
  const localeMenuRef = useRef<HTMLDivElement | null>(null);

  const copy = getLocaleCopy(locale);
  const authError = errorMsg || searchError;
  const footerHref =
    mode === "login"
      ? `/register${safeNext !== CUSTOMER_PORTAL_DEFAULT_REDIRECT ? `?next=${encodeURIComponent(safeNext)}` : ""}`
      : `/login${safeNext !== CUSTOMER_PORTAL_DEFAULT_REDIRECT ? `?next=${encodeURIComponent(safeNext)}` : ""}`;

  const modeTabs = useMemo(
    () => [
      {
        href: `/login${safeNext !== CUSTOMER_PORTAL_DEFAULT_REDIRECT ? `?next=${encodeURIComponent(safeNext)}` : ""}`,
        label: copy.loginTab,
        active: mode === "login",
      },
      {
        href: `/register${safeNext !== CUSTOMER_PORTAL_DEFAULT_REDIRECT ? `?next=${encodeURIComponent(safeNext)}` : ""}`,
        label: copy.registerTab,
        active: mode === "register",
      },
    ],
    [copy.loginTab, copy.registerTab, mode, safeNext],
  );

  const socialButtons: Array<{
    key: AuthProvider | "apple";
    label: string;
    enabled: boolean;
  }> = [
    {
      key: "google",
      label: copy.continueWithGoogle,
      enabled: Boolean(providerConfig.find((item) => item.provider === "google")?.enabled),
    },
    {
      key: "apple",
      label: copy.continueWithApple,
      enabled: false,
    },
    {
      key: "facebook",
      label: copy.continueWithFacebook,
      enabled: Boolean(providerConfig.find((item) => item.provider === "facebook")?.enabled),
    },
  ];

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

  const handlePrimaryAction = async () => {
    setErrorMsg("");

    if (enabledProviders.length === 1) {
      await handleProviderAuth(enabledProviders[0].provider);
      return;
    }

    setErrorMsg(copy.chooseProvider);
  };

  useEffect(() => {
    if (!isLocaleMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!localeMenuRef.current?.contains(event.target as Node)) {
        setIsLocaleMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLocaleMenuOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isLocaleMenuOpen]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#102238] px-3 py-3 text-slate-950 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
      <div className="relative mx-auto min-h-[calc(100vh-1.5rem)] max-w-[1560px] overflow-hidden rounded-[30px] bg-[#112740] shadow-[0_36px_108px_rgba(5,15,35,0.45)] sm:min-h-[calc(100vh-2rem)]">
        <div className="absolute inset-0">
          <Image
            src="/home-assets/background-login-customer.png"
            alt="Customer login background"
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,240,227,0.72)_0%,rgba(255,247,240,0.28)_28%,rgba(16,34,56,0.1)_48%,rgba(8,18,35,0.68)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.36),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(18,31,46,0.6),transparent_34%),radial-gradient(circle_at_top_right,rgba(28,75,133,0.38),transparent_30%)]" />
        </div>

        <div className="relative grid min-h-[calc(100vh-1.5rem)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="flex items-stretch">
            <div className="flex w-full flex-col justify-between px-5 py-7 text-white sm:px-9 sm:py-9 lg:px-12 lg:py-12">
              <div className="max-w-[340px] pt-1">
                <div className="flex items-center">
                  <Image
                    src="/logo-redfeng.png"
                    alt="RedFeng"
                    width={174}
                    height={174}
                    className="h-[7.4rem] w-[7.4rem] object-contain object-left"
                  />
                </div>

                <p className="mt-6 max-w-[300px] text-[20px] leading-[1.5] text-slate-800 sm:text-[23px]">
                  {copy.heroTagline}
                </p>
              </div>

              <div className="mt-8 max-w-[390px]">
                <div className="space-y-5">
                  {copy.leftFeatures.map((feature, index) => (
                    <div key={feature.title} className="flex items-start gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(124,21,15,0.72)] shadow-[0_10px_24px_rgba(71,10,7,0.3)] ring-1 ring-white/12">
                        <span className="text-base font-semibold text-white">{index + 1}</span>
                      </div>
                      <div className="pt-1">
                        <div className="text-[23px] font-semibold leading-tight text-white sm:text-[25px]">{feature.title}</div>
                        <p className="mt-1.5 max-w-[260px] text-base leading-7 text-white/88">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex items-center gap-3">
                  <span className="h-3.5 w-3.5 rounded-full bg-[#ff2f24]" />
                  <span className="h-3.5 w-3.5 rounded-full bg-white/75" />
                  <span className="h-3.5 w-3.5 rounded-full bg-white/75" />
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
            <div className="w-full max-w-[780px] rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(255,252,248,0.98)_100%)] px-6 py-6 shadow-[0_24px_76px_rgba(9,19,35,0.2)] backdrop-blur sm:px-8 sm:py-8 lg:min-h-[80vh] lg:px-12 lg:py-10">
              <div className="flex justify-end">
                <div ref={localeMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsLocaleMenuOpen((current) => !current)}
                    className={`flex items-center gap-3 rounded-full border bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition duration-200 ${
                      isLocaleMenuOpen ? "border-slate-300 shadow-[0_14px_36px_rgba(15,23,42,0.1)]" : "border-slate-200 hover:border-slate-300"
                    }`}
                    aria-haspopup="menu"
                    aria-expanded={isLocaleMenuOpen}
                    aria-label="Select language"
                  >
                    <GlobeIcon />
                    <span className="min-w-[1.8rem] text-left text-base font-medium text-slate-800">
                      {localeOptions.find((option) => option.value === locale)?.label || "ID"}
                    </span>
                    <span className={`transition duration-200 ${isLocaleMenuOpen ? "rotate-180" : ""}`}>
                      <ChevronDownIcon />
                    </span>
                  </button>

                  {isLocaleMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 z-20 mt-3 min-w-[10rem] overflow-hidden rounded-[20px] border border-slate-200/90 bg-white/98 p-2 shadow-[0_22px_60px_rgba(15,23,42,0.16)] backdrop-blur animate-[fadeIn_.16s_ease-out]"
                    >
                      {localeOptions.map((option) => {
                        const active = option.value === locale;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="menuitemradio"
                            aria-checked={active}
                            onClick={() => {
                              setIsLocaleMenuOpen(false);
                              if (option.value !== locale) {
                                void updateLocale(option.value);
                              }
                            }}
                            className={`flex w-full items-center justify-between rounded-[16px] px-4 py-3 text-left text-sm font-medium transition duration-150 ${
                              active
                                ? "bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-slate-900 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.16)]"
                                : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <span className="pl-1">{option.label}</span>
                            <span className={`flex items-center gap-2 ${active ? "text-slate-500" : "text-transparent"}`}>
                              <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Active</span>
                              <CheckIcon />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-10 max-w-[390px]">
                <h1 className="text-[38px] font-semibold tracking-[-0.03em] text-[#0f172a] sm:text-[46px]">
                  {copy.welcome}
                </h1>
                <p className="mt-3 max-w-[320px] text-[19px] leading-[1.65] text-slate-500 sm:text-[21px]">
                  {copy.subtitle}
                </p>
              </div>

              <div className="mt-11">
                <div className="flex border-b border-slate-200">
                  {modeTabs.map((tab) => (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      className={`relative flex-1 pb-4 text-center text-[22px] font-semibold transition sm:text-[24px] ${
                        tab.active ? "text-[#ff2a1c]" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {tab.label}
                      {tab.active ? <span className="absolute inset-x-0 bottom-[-1px] h-[4px] rounded-full bg-[#ff2a1c]" /> : null}
                    </Link>
                  ))}
                </div>

                <div className="mt-10 space-y-5">
                  <label className="flex h-[68px] items-center gap-4 rounded-[16px] border border-slate-200 bg-white px-5 text-slate-400 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <span className="text-slate-500">
                      <UserIcon />
                    </span>
                    <input
                      type="text"
                      value={emailVisual}
                      onChange={(event) => setEmailVisual(event.target.value)}
                      placeholder={copy.emailPlaceholder}
                        className="w-full bg-transparent text-[18px] text-slate-700 outline-none placeholder:text-slate-400 sm:text-[20px]"
                      />
                  </label>

                  <label className="flex h-[68px] items-center gap-4 rounded-[16px] border border-slate-200 bg-white px-5 text-slate-400 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <span className="text-slate-500">
                      <LockIcon />
                    </span>
                    <input
                      type="password"
                      value={passwordVisual}
                      onChange={(event) => setPasswordVisual(event.target.value)}
                      placeholder={copy.passwordPlaceholder}
                        className="w-full bg-transparent text-[18px] text-slate-700 outline-none placeholder:text-slate-400 sm:text-[20px]"
                      />
                    <span className="text-slate-400">
                      <EyeIcon />
                    </span>
                  </label>
                </div>

                {mode === "login" ? (
                  <div className="mt-4 flex justify-end">
                    <Link href={`/forgot-password?next=/login`} className="text-[16px] font-medium text-[#ff2a1c] hover:text-[#ef1c0d]">
                      {copy.forgotPassword}
                    </Link>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handlePrimaryAction()}
                  disabled={loadingProvider !== null}
                  className="mt-10 inline-flex h-[70px] w-full items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#ff2f24_0%,#f31508_100%)] px-6 text-[24px] font-semibold text-white shadow-[0_18px_38px_rgba(255,47,36,0.26)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loadingProvider ? copy.processing : mode === "login" ? copy.primaryLogin : copy.primaryRegister}
                </button>

                <div className="mt-10 flex items-center gap-4 text-center text-[16px] text-slate-400">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span>{copy.divider}</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="mt-8 space-y-4">
                  {socialButtons.map((button) => {
                    const active = button.enabled && button.key !== "apple";

                    return (
                      <button
                        key={button.key}
                        type="button"
                        disabled={!active || loadingProvider !== null}
                        onClick={() => {
                          if (button.key === "google" || button.key === "facebook") {
                            void handleProviderAuth(button.key);
                          }
                        }}
                        className={`flex h-[68px] w-full items-center justify-between rounded-[16px] border px-5 text-left shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition ${
                          active
                            ? "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[#ffddd7]"
                            : "cursor-not-allowed border-slate-200 bg-white/75 opacity-70"
                        }`}
                      >
                        <span className="flex items-center gap-5">
                          <span className="grid h-9 w-9 place-items-center">{getProviderIcon(button.key)}</span>
                          <span className="text-[18px] font-medium text-slate-800 sm:text-[20px]">{button.label}</span>
                        </span>
                        {!active ? <span className="text-sm font-medium text-slate-400">{copy.disabledProvider}</span> : null}
                      </button>
                    );
                  })}
                </div>

                {authError ? (
                  <div className="mt-5 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {authError}
                  </div>
                ) : null}

                <p className="mt-10 text-center text-[18px] text-slate-700 sm:text-[20px]">
                  {mode === "login" ? copy.noAccount : copy.haveAccount}{" "}
                  <Link href={footerHref} className="font-medium text-[#ff2a1c] hover:text-[#ef1c0d]">
                    {mode === "login" ? copy.registerNow : copy.loginNow}
                  </Link>
                </p>

                <p className="mt-4 text-center text-sm leading-6 text-slate-500">
                  {copy.termsLead}{" "}
                  <Link href="/terms" className="font-semibold text-slate-700 hover:text-[#ff2a1c]">
                    {copy.terms}
                  </Link>{" "}
                  {locale === "id" ? "dan" : locale === "zh" ? "和" : "and"}{" "}
                  <Link href="/privacy" className="font-semibold text-slate-700 hover:text-[#ff2a1c]">
                    {copy.privacy}
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
