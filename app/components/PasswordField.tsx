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
        className="absolute inset-y-0 right-4 inline-flex items-center justify-center text-slate-500 transition hover:text-slate-800"
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
      >
        {visible ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
            <path d="M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 7.5a11.8 11.8 0 0 1-3.04 4.36"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6.61 6.61C4.62 7.88 3.09 9.57 2 11.5 3.73 15.89 7 19 12 19c1.61 0 3.13-.32 4.5-.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
            <path
              d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}
