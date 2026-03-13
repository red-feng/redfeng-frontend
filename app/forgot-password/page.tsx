"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizeLocale, type Locale } from "@/lib/i18n";

function getLocaleFromCookie(): Locale {
  if (typeof document === "undefined") return "id";
  const cookie = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("rf_locale="));
  return normalizeLocale(cookie?.split("=")[1]);
}

function getSafeLoginTarget() {
  if (typeof window === "undefined") return "/login";
  const requestedNext = new URLSearchParams(window.location.search).get("next");
  return requestedNext && requestedNext.startsWith("/") ? requestedNext : "/login";
}

const copy = {
  id: {
    eyebrow: "Reset Password",
    title: "Kirim link reset password",
    subtitle:
      "Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat password baru.",
    label: "Email akun",
    placeholder: "you@example.com",
    submit: "Kirim link reset",
    sending: "Mengirim...",
    success:
      "Link reset password sudah dikirim. Cek email Anda dan buka tautannya untuk mengatur password baru.",
    back: "Kembali ke login",
  },
  en: {
    eyebrow: "Password Reset",
    title: "Send password reset link",
    subtitle:
      "Enter your account email. We will send a link to create a new password.",
    label: "Account email",
    placeholder: "you@example.com",
    submit: "Send reset link",
    sending: "Sending...",
    success:
      "The password reset link has been sent. Please check your email and open the link to set a new password.",
    back: "Back to login",
  },
  zh: {
    eyebrow: "密码重置",
    title: "发送重置链接",
    subtitle: "请输入您的账户邮箱。我们会发送一个链接供您设置新密码。",
    label: "账户邮箱",
    placeholder: "you@example.com",
    submit: "发送重置链接",
    sending: "发送中...",
    success: "密码重置链接已发送。请检查您的邮箱并打开链接设置新密码。",
    back: "返回登录",
  },
} satisfies Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    label: string;
    placeholder: string;
    submit: string;
    sending: string;
    success: string;
    back: string;
  }
>;

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [locale] = useState<Locale>(() => getLocaleFromCookie());
  const [loginTarget] = useState(getSafeLoginTarget);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const t = copy[locale];

  const handleResetRequest = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError(locale === "en" ? "Email is required." : locale === "zh" ? "请输入邮箱。" : "Email wajib diisi.");
      setLoading(false);
      return;
    }

    const redirectTo =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/reset-password?next=${encodeURIComponent(loginTarget)}`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSuccess(t.success);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f6f0e8_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-orange-100 bg-white p-8 shadow-[0_24px_70px_rgba(148,64,14,0.08)] sm:p-10">
          <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-700">
            {t.eyebrow}
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {t.title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{t.subtitle}</p>

          {error ? (
            <div className="mt-8 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-8 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="mt-8 space-y-6">
            <div className="space-y-3">
              <label
                htmlFor="forgot-password-email"
                className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500"
              >
                {t.label}
              </label>
              <input
                id="forgot-password-email"
                type="email"
                autoComplete="email"
                className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder={t.placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={handleResetRequest}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_42%,#fb923c_100%)] px-5 py-4 text-base font-semibold text-white shadow-[0_16px_36px_rgba(194,65,12,0.24)] transition hover:shadow-[0_20px_44px_rgba(194,65,12,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? t.sending : t.submit}
            </button>
          </div>

          <Link
            href={loginTarget}
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-orange-700 transition hover:text-orange-800"
          >
            {t.back}
          </Link>
        </div>
      </div>
    </main>
  );
}
