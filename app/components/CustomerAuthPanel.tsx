"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { dictionaries, type Locale } from "@/lib/i18n";

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
      "flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-70",
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
  const enabledProviders = providerConfig.filter((item) => item.enabled);

  const t = getLoginDictionary(locale);
  const footerHref = mode === "login" ? "/register" : "/login";
  const footerLead = mode === "login" ? t.registerCta : t.loginCta;
  const footerLabel = mode === "login" ? t.registerLink : t.loginLink;
  const eyebrow = useMemo(
    () => (mode === "login" ? t.title : footerLabel === t.loginLink ? "Daftar Cepat" : t.title),
    [footerLabel, mode, t.title, t.loginLink],
  );
  const showcaseTitle =
    mode === "login" ? "Akses perjalanan premium dalam satu akun" : "Buat akun untuk booking lebih cepat";
  const showcaseCopy =
    mode === "login"
      ? "Masuk sekali untuk melanjutkan checkout, melihat booking, dan terhubung ke pengalaman Red Feng di website utama."
      : "Daftar dengan akun sosial untuk menyimpan detail traveler, memantau booking, dan mempermudah transaksi berikutnya.";
  const trustItems = [
    "Kurasi paket dan merchant terverifikasi",
    "Checkout cepat untuk perjalanan privat dan grup",
    "Sinkron dengan akun customer Red Feng",
  ];

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
    <main className="relative min-h-screen overflow-hidden bg-[#f6f3ee] px-4 py-8 md:px-6 md:py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.22),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(194,65,12,0.18),_transparent_24%),linear-gradient(180deg,#fbf7f1_0%,#f4efe8_100%)]" />
      <div className="absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="absolute bottom-10 right-[-6rem] h-80 w-80 rounded-full bg-amber-100/70 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl overflow-hidden rounded-[36px] border border-white/70 bg-white shadow-[0_30px_120px_rgba(95,45,12,0.14)] lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden bg-[linear-gradient(155deg,#a84316_0%,#d86118_28%,#ef7f1a_55%,#f6b14f_100%)] px-7 py-8 text-white md:px-10 md:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(124,45,18,0.34),_transparent_32%)]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-50/80">
                  Red Feng
                </p>
                <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight md:text-5xl">
                  {showcaseTitle}
                </h2>
              </div>
              <div className="hidden rounded-[28px] border border-white/20 bg-white/12 px-5 py-4 text-right shadow-[0_16px_50px_rgba(124,45,18,0.2)] backdrop-blur md:block">
                <div className="text-xs uppercase tracking-[0.22em] text-orange-50/75">Preferred sign-in</div>
                <div className="mt-2 text-2xl font-semibold">Social OAuth</div>
              </div>
            </div>

            <p className="mt-6 max-w-xl text-sm leading-7 text-orange-50/88 md:text-base">
              {showcaseCopy}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[26px] border border-white/16 bg-white/12 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.22em] text-orange-50/70">Booking flow</p>
                <p className="mt-3 text-3xl font-semibold">1x</p>
                <p className="mt-2 text-sm text-orange-50/85">
                  Satu akun untuk checkout, dashboard, dan sinkron ke website utama.
                </p>
              </div>
              <div className="rounded-[26px] border border-white/16 bg-white/12 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.22em] text-orange-50/70">Support</p>
                <p className="mt-3 text-3xl font-semibold">24/7</p>
                <p className="mt-2 text-sm text-orange-50/85">
                  Riwayat customer tersimpan agar tim dapat menangani permintaan lebih cepat.
                </p>
              </div>
              <div className="rounded-[26px] border border-white/16 bg-white/12 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.22em] text-orange-50/70">Trust layer</p>
                <p className="mt-3 text-3xl font-semibold">OTA</p>
                <p className="mt-2 text-sm text-orange-50/85">
                  Pengalaman login dibuat lebih rapi, aman, dan konsisten seperti platform travel besar.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[30px] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.17),rgba(255,255,255,0.09))] p-6 shadow-[0_18px_70px_rgba(124,45,18,0.22)] backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-orange-50/70">
                    Why customers use Red Feng
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    Premium travel, checkout discipline, cleaner account access.
                  </p>
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
        </section>

        <section className="relative flex items-center bg-[linear-gradient(180deg,#fffdfa_0%,#fff7ef_100%)] px-5 py-8 md:px-8 lg:px-10">
          <div className="w-full">
            <div className="mx-auto max-w-md rounded-[32px] border border-[#f1e4d5] bg-white/95 p-7 shadow-[0_22px_60px_rgba(95,45,12,0.08)] backdrop-blur">
              <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-orange-700">
                {eyebrow}
              </div>
              <h1 className="mt-5 text-3xl font-semibold leading-tight text-slate-950">{t.title}</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">{t.subtitle}</p>

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
                {t.autoCreateHint}
              </div>

              {errorMsg ? (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMsg}
                </div>
              ) : null}

              <p className="mt-6 text-xs leading-6 text-slate-500">
                {t.termsLead}{" "}
                <Link href="/terms" className="font-semibold text-orange-700 hover:text-orange-800">
                  {t.terms}
                </Link>{" "}
                dan{" "}
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
