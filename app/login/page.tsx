"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dictionaries, type Locale } from "@/lib/i18n";

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

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [locale] = useState<Locale>(() => getLocaleFromCookie());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const t = dictionaries[locale].login;

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile) return;

      if (profile.role === "merchant") {
        router.replace("/merchant/dashboard");
      } else if (profile.role === "admin" || profile.role === "superadmin") {
        router.replace("/admin/dashboard");
      }
    };

    checkSession();
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace("/");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile) {
      router.replace("/");
      return;
    }

    if (profile.role === "merchant") {
      router.replace("/merchant/dashboard");
    } else if (profile.role === "admin" || profile.role === "superadmin") {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="mb-6 text-center text-2xl font-bold">{t.title}</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder={t.email}
            className="w-full rounded border p-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder={t.password}
            className="w-full rounded border p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {errorMsg && <div className="text-sm text-red-500">{errorMsg}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 text-white transition hover:bg-blue-700"
          >
            {loading ? t.loggingIn : t.login}
          </button>
        </form>
      </div>
    </main>
  );
}
