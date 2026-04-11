"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthLocaleDropdown from "@/app/components/AuthLocaleDropdown";
import PasswordField from "@/app/components/PasswordField";
import { createClient } from "@/lib/supabase/client";
import { dictionaries, type Locale } from "@/lib/i18n";
import { readLocaleFromCookie } from "@/lib/locale-client";

function getSafeLoginTarget() {
  if (typeof window === "undefined") return "/login";
  const requestedNext = new URLSearchParams(window.location.search).get("next");
  return requestedNext && requestedNext.startsWith("/") ? requestedNext : "/login";
}

function getResetCopy(locale: Locale) {
  const t = dictionaries[locale].resetPassword;

  if (locale === "en") {
    return {
      ...t,
      eyebrow: "Password Reset",
      subtitle: "Create your new password to continue signing in securely to your Red Feng account.",
      back: "Back to login",
    };
  }

  if (locale === "zh") {
    return {
      ...t,
      eyebrow: "密码重置",
      subtitle: "设置您的新密码，以便安全地继续登录 Red Feng 账号。",
      back: "返回登录",
    };
  }

  return {
    ...t,
    eyebrow: "Reset Password",
    subtitle: "Buat password baru Anda untuk melanjutkan login ke akun Red Feng dengan aman.",
    back: "Kembali ke login",
  };
}

export default function ResetPasswordClient({ initialLocale }: { initialLocale: Locale }) {
  const supabase = createClient();
  const router = useRouter();

  const [locale] = useState<Locale>(() => initialLocale || readLocaleFromCookie());
  const [loginTarget] = useState(getSafeLoginTarget);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const t = getResetCopy(locale);

  const handleUpdatePassword = async () => {
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    alert(t.success);
    router.push(loginTarget);
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f6f0e8_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-orange-100 bg-white p-8 shadow-[0_24px_70px_rgba(148,64,14,0.08)] sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-700">
                {t.eyebrow}
              </span>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t.title}</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{t.subtitle}</p>
            </div>
            <AuthLocaleDropdown locale={locale} />
          </div>

          <div className="mt-8 space-y-6">
            <div className="space-y-3">
              <PasswordField
                id="reset-password"
                autoComplete="new-password"
                placeholder={t.placeholder}
                className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 pr-28 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                value={password}
                onChange={setPassword}
              />
            </div>

            <button
              onClick={handleUpdatePassword}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_42%,#fb923c_100%)] px-5 py-4 text-base font-semibold text-white shadow-[0_16px_36px_rgba(194,65,12,0.24)] transition hover:shadow-[0_20px_44px_rgba(194,65,12,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? t.updating : t.update}
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
