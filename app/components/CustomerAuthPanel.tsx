"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { dictionaries, type Locale } from "@/lib/i18n";

type AuthProvider = "google" | "apple" | "facebook";
type Mode = "login" | "register";

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

function AppleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M15.1 3.2c.9-1.1 1.4-2.5 1.3-3.2-1.3.1-2.7.9-3.6 2-.8.9-1.5 2.4-1.3 3.7 1.4.1 2.8-.7 3.6-2.5Zm4.2 14.6c-.8 1.2-1.2 1.7-2.2 3-1.3 1.6-3.2 3.5-5.5 3.5-2 0-2.6-1.3-5-1.3-2.4 0-3.1 1.3-5.1 1.3-2.3 0-4.1-1.7-5.4-3.3C-3.3 16.8-4.4 12-2.1 8.3c1.6-2.5 4-4 6.3-4 2.4 0 3.8 1.3 5.8 1.3 1.9 0 3.1-1.3 5.8-1.3 2 0 4.2 1.1 5.7 3.1-5 2.7-4.2 9.7-2.2 10.4Z" />
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
    case "apple":
      return <AppleIcon />;
    case "facebook":
      return <FacebookIcon />;
  }
}

function getLocaleFromCookie(): Locale {
  if (typeof document === "undefined") return "id";
  const cookie = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("rf_locale="));
  const value = cookie?.split("=")[1];
  if (value === "en" || value === "zh" || value === "th") return value;
  return "id";
}

function getSafeNextFromLocation() {
  if (typeof window === "undefined") return "/customer/dashboard";
  const requestedNext = new URLSearchParams(window.location.search).get("next");
  return requestedNext && requestedNext.startsWith("/") ? requestedNext : "/customer/dashboard";
}

export default function CustomerAuthPanel({ mode }: { mode: Mode }) {
  const supabase = createClient();
  const [locale] = useState<Locale>(() => getLocaleFromCookie());
  const [safeNext] = useState(getSafeNextFromLocation);
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const t = dictionaries[locale].login;
  const footerHref = mode === "login" ? "/register" : "/login";
  const footerLead = mode === "login" ? t.registerCta : t.loginCta;
  const footerLabel = mode === "login" ? t.registerLink : t.loginLink;
  const eyebrow = useMemo(
    () => (mode === "login" ? t.title : footerLabel === t.loginLink ? "Daftar Cepat" : t.title),
    [footerLabel, mode, t.title, t.loginLink],
  );

  const handleProviderAuth = async (provider: AuthProvider) => {
    setLoadingProvider(provider);
    setErrorMsg("");

    const redirectTo =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#dff1ff_0%,#eff5fb_48%,#f7f8fb_100%)] px-4 py-12">
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.18),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.20),_transparent_30%)]" />
      <div className="relative w-full max-w-xl overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.12)]">
        <div className="grid gap-8 bg-[linear-gradient(135deg,#ecfeff_0%,#f0f9ff_46%,#fff7ed_100%)] px-8 py-8 md:grid-cols-[1.35fr,0.9fr]">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
              {eyebrow}
            </div>
            <h1 className="max-w-sm text-3xl font-bold leading-tight text-slate-950">{t.title}</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">{t.subtitle}</p>
          </div>
          <div className="flex items-center justify-center">
            <div className="grid h-28 w-28 place-items-center rounded-[28px] bg-white/90 shadow-[0_12px_30px_rgba(14,165,233,0.14)]">
              <div className="grid h-20 w-20 place-items-center rounded-[24px] bg-[linear-gradient(135deg,#0284c7_0%,#38bdf8_52%,#fb923c_100%)] text-center text-sm font-semibold text-white">
                Red
                <br />
                Feng
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 pt-7">
          <button
            type="button"
            onClick={() => handleProviderAuth("google")}
            disabled={loadingProvider !== null}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {getProviderIcon("google")}
            <span>{loadingProvider === "google" ? t.processing : t.continueWithGoogle}</span>
          </button>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleProviderAuth("apple")}
              disabled={loadingProvider !== null}
              className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {getProviderIcon("apple")}
              <span>{loadingProvider === "apple" ? t.processing : t.continueWithApple}</span>
            </button>
            <button
              type="button"
              onClick={() => handleProviderAuth("facebook")}
              disabled={loadingProvider !== null}
              className="flex items-center justify-center gap-3 rounded-2xl border border-[#dbeafe] bg-[#1877F2] px-5 py-4 text-base font-semibold text-white transition hover:bg-[#166fe5] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {getProviderIcon("facebook")}
              <span>{loadingProvider === "facebook" ? t.processing : t.continueWithFacebook}</span>
            </button>
          </div>

          <div className="my-6 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            <span>{t.otherOptions}</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <p className="mx-auto max-w-md text-center text-sm leading-6 text-slate-600">{t.autoCreateHint}</p>

          {errorMsg ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMsg}
            </div>
          ) : null}

          <p className="mt-6 text-center text-xs leading-6 text-slate-500">
            {t.termsLead}{" "}
            <Link href="/terms" className="font-semibold text-sky-700 hover:text-sky-800">
              {t.terms}
            </Link>{" "}
            dan{" "}
            <Link href="/privacy" className="font-semibold text-sky-700 hover:text-sky-800">
              {t.privacy}
            </Link>
            .
          </p>

          <p className="mt-5 text-center text-sm text-slate-600">
            {footerLead}{" "}
            <Link href={footerHref} className="font-semibold text-orange-600 hover:text-orange-700">
              {footerLabel}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
