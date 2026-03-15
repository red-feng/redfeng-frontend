"use client"

import { useRouter } from "next/navigation"
import { type Locale } from "@/lib/i18n"

type MerchantLanguageSwitcherProps = {
  locale: Locale
  label: string
  options: Array<{ value: Locale; label: string }>
}

export default function MerchantLanguageSwitcher({
  locale,
  label,
  options,
}: MerchantLanguageSwitcherProps) {
  const router = useRouter()

  const handleChange = async (nextLocale: string) => {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    })
    router.refresh()
  }

  return (
    <label className="flex items-center gap-2 rounded-full border border-[#ecd9c2] bg-white px-3 py-2 text-sm font-medium text-slate-700">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <select
        value={locale}
        onChange={(event) => handleChange(event.target.value)}
        className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
