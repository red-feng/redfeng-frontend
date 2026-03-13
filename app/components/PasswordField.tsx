"use client"

import { useState } from "react"

type PasswordFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  className?: string
}

export default function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  className,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-4 inline-flex items-center text-sm font-semibold text-slate-500 transition hover:text-slate-800"
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
      >
        {visible ? "Sembunyikan" : "Lihat"}
      </button>
    </div>
  )
}
