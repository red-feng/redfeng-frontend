"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"

type MerchantAdminHelpWidgetProps = {
  locale: string
  merchantLabel: string
  merchantCode: string
}

type WidgetCopy = {
  launcher: string
  badge: string
  title: string
  subtitle: string
  adminName: string
  adminRole: string
  adminMessage: string
  chips: string[]
  responseLabel: string
  responseValue: string
  primaryAction: string
  secondaryAction: string
  closeLabel: string
}

const copyByLocale: Record<string, WidgetCopy> = {
  id: {
    launcher: "Bantuan admin",
    badge: "Admin Help Desk",
    title: "Butuh bantuan dari admin Red Feng?",
    subtitle: "Buka panel ini untuk follow-up verifikasi, paket, booking, atau payout merchant Anda.",
    adminName: "Tim Admin Red Feng",
    adminRole: "Merchant support",
    adminMessage: "Halo, kami siap bantu untuk review paket, klarifikasi operasional, dan follow-up kendala merchant.",
    chips: ["Review paket", "Kendala booking", "Payout", "Verifikasi akun"],
    responseLabel: "Estimasi respons",
    responseValue: "< 15 menit pada jam operasional",
    primaryAction: "Hubungi admin",
    secondaryAction: "Buka chat customer",
    closeLabel: "Tutup bantuan admin",
  },
  en: {
    launcher: "Admin help",
    badge: "Admin Help Desk",
    title: "Need help from the Red Feng admin team?",
    subtitle: "Open this panel for verification follow-ups, package review, booking issues, or payout questions.",
    adminName: "Red Feng Admin Team",
    adminRole: "Merchant support",
    adminMessage: "Hello, we are ready to help with package reviews, operational clarification, and merchant issue follow-up.",
    chips: ["Package review", "Booking issue", "Payout", "Account verification"],
    responseLabel: "Response time",
    responseValue: "< 15 minutes during working hours",
    primaryAction: "Contact admin",
    secondaryAction: "Open customer chat",
    closeLabel: "Close admin help",
  },
  zh: {
    launcher: "管理员帮助",
    badge: "Admin Help Desk",
    title: "需要 Red Feng 管理团队协助吗？",
    subtitle: "打开此面板即可跟进审核、套餐、订单或结算问题。",
    adminName: "Red Feng 管理团队",
    adminRole: "商家支持",
    adminMessage: "您好，我们可以协助套餐审核、运营说明以及商家问题跟进。",
    chips: ["套餐审核", "订单问题", "结算", "账号审核"],
    responseLabel: "响应时间",
    responseValue: "工作时间内少于 15 分钟",
    primaryAction: "联系管理员",
    secondaryAction: "打开客户聊天",
    closeLabel: "关闭管理员帮助",
  },
}

function buildMailtoHref(input: { merchantLabel: string; merchantCode: string }) {
  const subject = `Merchant Support - ${input.merchantLabel} (${input.merchantCode})`
  const body = [
    "Halo Admin Red Feng,",
    "",
    `Merchant: ${input.merchantLabel}`,
    `Merchant Code: ${input.merchantCode}`,
    "",
    "Topik bantuan:",
    "- ",
    "",
    "Detail kendala:",
    "- ",
  ].join("\n")

  return `mailto:admin@redfeng.co?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export default function MerchantAdminHelpWidget({
  locale,
  merchantLabel,
  merchantCode,
}: MerchantAdminHelpWidgetProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const t = copyByLocale[locale] || copyByLocale.id
  const mailtoHref = useMemo(() => buildMailtoHref({ merchantLabel, merchantCode }), [merchantCode, merchantLabel])
  const hideOnChatPage = pathname === "/merchant/chat"

  if (hideOnChatPage) return null

  return (
    <div className="pointer-events-none fixed bottom-5 right-4 z-50 sm:bottom-6 sm:right-6">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {open ? (
          <section className="w-[min(92vw,380px)] overflow-hidden rounded-[28px] border border-orange-200/80 bg-[linear-gradient(180deg,rgba(255,250,243,0.98)_0%,rgba(255,255,255,0.98)_100%)] shadow-[0_28px_80px_rgba(146,64,14,0.22)] backdrop-blur-xl">
            <div className="relative overflow-hidden border-b border-orange-100 bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_56%,#fdba74_100%)] px-5 py-5 text-white">
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-50">
                      {t.badge}
                    </span>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight">{t.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-orange-50/90">{t.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={t.closeLabel}
                    onClick={() => setOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-semibold text-white transition hover:bg-white/20"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-[24px] border border-[#f1dcc5] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff0df_0%,#ffe1bf_100%)] shadow-[0_10px_24px_rgba(249,115,22,0.18)]">
                    <Image src="/redfeng-favicon.png" alt="Red Feng" width={26} height={26} className="h-6 w-6 object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-950">{t.adminName}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-600">{t.adminRole}</p>
                    <div className="mt-3 rounded-[18px] border border-orange-100 bg-[#fff7ef] px-4 py-3 text-sm leading-6 text-slate-700">
                      {t.adminMessage}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#f1e6d7] bg-[#fffdf9] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{t.responseLabel}</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{t.responseValue}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {t.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-semibold text-orange-700"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#f1e6d7] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Merchant</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{merchantLabel}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-orange-600">{merchantCode}</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={mailtoHref}
                  className="inline-flex flex-1 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ea580c_0%,#f97316_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(249,115,22,0.24)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_36px_rgba(249,115,22,0.28)]"
                >
                  {t.primaryAction}
                </a>
                <Link
                  href="/merchant/chat"
                  className="inline-flex flex-1 items-center justify-center rounded-[18px] border border-[#ead8c0] bg-[#fffaf4] px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-white hover:text-orange-600"
                >
                  {t.secondaryAction}
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <button
          type="button"
          aria-label={t.launcher}
          onClick={() => setOpen((current) => !current)}
          className="group flex items-center gap-3 rounded-full border border-orange-200/80 bg-white/95 px-3 py-3 shadow-[0_20px_50px_rgba(146,64,14,0.2)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-orange-300"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff1df_0%,#ffd8ae_100%)] shadow-[0_14px_28px_rgba(249,115,22,0.22)]">
            <Image src="/redfeng-favicon.png" alt="Red Feng" width={28} height={28} className="h-7 w-7 object-contain" />
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold text-slate-950">{t.launcher}</span>
            <span className="mt-0.5 block text-xs text-slate-500">Red Feng merchant support</span>
          </span>
          <span className="relative hidden h-3 w-3 shrink-0 sm:block">
            <span className="absolute inset-0 rounded-full bg-emerald-500" />
            <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-70 blur-[2px] group-hover:scale-125" />
          </span>
        </button>
      </div>
    </div>
  )
}
