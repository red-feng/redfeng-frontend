"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

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

function resetText(locale: Locale) {
  if (locale === "en" || locale === "zh" || locale === "th") {
    return {
      title: "Set New Password",
      placeholder: "New password",
      updating: "Updating...",
      update: "Update Password",
      success: "Password updated successfully",
    };
  }

  return {
    title: "Atur Password Baru",
    placeholder: "Password baru",
    updating: "Menyimpan...",
    update: "Perbarui Password",
    success: "Password berhasil diperbarui",
  };
}

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [locale] = useState<Locale>(() => getLocaleFromCookie());
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const t = resetText(locale);

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
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-96 rounded bg-white p-8 shadow">
        <h1 className="mb-4 text-xl font-bold">{t.title}</h1>

        <input
          type="password"
          placeholder={t.placeholder}
          className="mb-4 w-full border p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleUpdatePassword}
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 text-white"
        >
          {loading ? t.updating : t.update}
        </button>
      </div>
    </div>
  );
}
