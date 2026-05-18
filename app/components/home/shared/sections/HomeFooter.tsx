import Image from "next/image"
import Link from "next/link"
import { ChevronDownIcon, payments } from "@/app/components/home/shared/homeContent"
import type { Locale } from "@/lib/i18n"

type FooterLinkItem = {
  label: string
  href: string
}

type FooterCopy = {
  company: string
  help: string
  partner: string
  paymentMethods: string
  companyItems: FooterLinkItem[]
  helpItems: FooterLinkItem[]
  partnerItems: FooterLinkItem[]
  rights: string
  terms: string
  privacy: string
}

export default function HomeFooter({ locale }: { locale: Locale }) {
  const copy: FooterCopy = {
    id: {
      company: "Perusahaan",
      help: "Bantuan",
      partner: "Partner",
      paymentMethods: "Metode Pembayaran",
      companyItems: [
        { label: "Promo", href: "/promo" },
        { label: "Paket Wisata", href: "/packages" },
        { label: "Bantuan", href: "/bantuan" },
      ],
      helpItems: [
        { label: "Pusat Bantuan", href: "/bantuan" },
        { label: "Cara Pemesanan", href: "/bantuan" },
        { label: "Pembayaran", href: "/bantuan" },
        { label: "Kebijakan & Privasi", href: "/privacy" },
      ],
      partnerItems: [
        { label: "Jadi Partner", href: "https://redfeng.co/kemitraan_tour/" },
        { label: "Affiliate", href: "https://redfeng.co/kemitraan_tour/" },
        { label: "Kerja Sama Korporat", href: "https://redfeng.co/kemitraan_tour/" },
      ],
      rights: "(c) 2026 RedFeng. All rights reserved.",
      terms: "Syarat & Ketentuan",
      privacy: "Kebijakan Privasi",
    },
    en: {
      company: "Company",
      help: "Help",
      partner: "Partner",
      paymentMethods: "Payment Methods",
      companyItems: [
        { label: "Promotions", href: "/promo" },
        { label: "Tour Packages", href: "/packages" },
        { label: "Help", href: "/bantuan" },
      ],
      helpItems: [
        { label: "Help Center", href: "/bantuan" },
        { label: "How to Book", href: "/bantuan" },
        { label: "Payments", href: "/bantuan" },
        { label: "Privacy Policy", href: "/privacy" },
      ],
      partnerItems: [
        { label: "Become a Partner", href: "https://redfeng.co/kemitraan_tour/" },
        { label: "Affiliate", href: "https://redfeng.co/kemitraan_tour/" },
        { label: "Corporate Partnership", href: "https://redfeng.co/kemitraan_tour/" },
      ],
      rights: "(c) 2026 RedFeng. All rights reserved.",
      terms: "Terms & Conditions",
      privacy: "Privacy Policy",
    },
    zh: {
      company: "公司",
      help: "帮助",
      partner: "合作伙伴",
      paymentMethods: "支付方式",
      companyItems: [
        { label: "优惠活动", href: "/promo" },
        { label: "旅游套餐", href: "/packages" },
        { label: "帮助中心", href: "/bantuan" },
      ],
      helpItems: [
        { label: "帮助中心", href: "/bantuan" },
        { label: "预订方式", href: "/bantuan" },
        { label: "支付说明", href: "/bantuan" },
        { label: "隐私政策", href: "/privacy" },
      ],
      partnerItems: [
        { label: "加入合作", href: "https://redfeng.co/kemitraan_tour/" },
        { label: "联盟合作", href: "https://redfeng.co/kemitraan_tour/" },
        { label: "企业合作", href: "https://redfeng.co/kemitraan_tour/" },
      ],
      rights: "(c) 2026 RedFeng. 版权所有。",
      terms: "条款与条件",
      privacy: "隐私政策",
    },
  }[locale]

  return (
    <footer className="home-footer border-t border-slate-200 bg-white">
      <div className="home-footer-shell mx-auto max-w-[1240px] px-4 pb-8 pt-8 sm:px-6 lg:px-8">
        <div className="home-footer-grid grid gap-8 xl:grid-cols-[1.2fr_0.6fr_0.6fr_0.6fr_1.3fr]">
          <div className="home-footer-brand">
            <Link href="/" className="home-footer-logo-link flex w-fit items-center gap-2">
              <Image
                src="/home-assets/logo-redfeng-header.png"
                alt="RedFeng"
                width={1536}
                height={1024}
                quality={100}
                unoptimized
                className="home-footer-logo h-[4.6rem] w-auto"
              />
            </Link>
            <div className="home-footer-social mt-4 flex gap-3 text-slate-500">
              <SocialIcon kind="ig" />
              <SocialIcon kind="fb" />
              <SocialIcon kind="yt" />
              <SocialIcon kind="tt" />
            </div>
          </div>

          <div className="home-footer-link-columns hidden xl:contents">
            <FooterColumn title={copy.company} items={copy.companyItems} />
            <FooterColumn title={copy.help} items={copy.helpItems} />
            <FooterColumn title={copy.partner} items={copy.partnerItems} />
          </div>

          <div className="home-footer-payments hidden xl:block">
            <h3 className="text-[15px] font-bold">{copy.paymentMethods}</h3>
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {payments.map((payment) => (
                <PaymentBadge
                  key={payment.label}
                  label={payment.label}
                  src={payment.src}
                  width={payment.width}
                  height={payment.height}
                  mobileRenderWidth={payment.mobileRenderWidth}
                  desktopRenderWidth={payment.desktopRenderWidth}
                  mobileScale={payment.mobileScale}
                  desktopScale={payment.desktopScale}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="home-footer-mobile-accordion mt-8 border-t border-slate-200 xl:hidden">
          <FooterAccordionRow title={copy.company} />
          <FooterAccordionRow title={copy.help} />
          <FooterAccordionRow title={copy.partner} />
          <FooterAccordionRow title={copy.paymentMethods} />
        </div>

        <div className="home-footer-legal mt-8 flex flex-col gap-3 border-t border-slate-200 pt-5 text-center text-[12px] text-slate-400 md:flex-row md:items-center md:justify-between md:text-left">
          <p>{copy.rights}</p>
          <div className="hidden gap-5 md:flex">
            <Link href="/terms" className="hover:text-slate-700">
              {copy.terms}
            </Link>
            <Link href="/privacy" className="hover:text-slate-700">
              {copy.privacy}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function PaymentBadge({
  label,
  src,
  width = 96,
  height = 24,
  mobileRenderWidth = 56,
  desktopRenderWidth = 64,
  mobileScale = 1,
  desktopScale = 1,
}: {
  label: string
  src?: string
  width?: number
  height?: number
  mobileRenderWidth?: number
  desktopRenderWidth?: number
  mobileScale?: number
  desktopScale?: number
}) {
  return (
    <span className="inline-flex h-11 w-full items-center justify-center rounded-[10px] border border-slate-200/90 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.28)]">
      {src ? (
        <>
          <span className="flex h-3.5 items-center justify-center lg:hidden" style={{ width: `${mobileRenderWidth}px` }}>
            <Image
              src={src}
              alt={label}
              width={width}
              height={height}
              className="h-3.5 w-auto object-contain"
              style={{ transform: `scale(${mobileScale})` }}
            />
          </span>
          <span className="hidden lg:flex lg:h-5 lg:items-center lg:justify-center" style={{ width: `${desktopRenderWidth}px` }}>
            <Image
              src={src}
              alt={label}
              width={width}
              height={height}
              className="h-5 w-auto object-contain"
              style={{ transform: `scale(${desktopScale})` }}
            />
          </span>
        </>
      ) : (
        label
      )}
    </span>
  )
}

function FooterAccordionRow({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 py-4">
      <span className="text-[15px] font-semibold text-slate-900">{title}</span>
      <ChevronDownIcon className="h-4 w-4 text-slate-700" />
    </div>
  )
}

function FooterColumn({ title, items }: { title: string; items: FooterLinkItem[] }) {
  return (
    <div>
      <h3 className="text-[15px] font-bold">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-[13px] text-slate-500">
        {items.map((item) => (
          <li key={`${title}-${item.label}`}>
            <Link href={item.href} className="hover:text-slate-800">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SocialIcon({ kind }: { kind: "ig" | "fb" | "yt" | "tt" }) {
  if (kind === "ig") {
    return <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 ring-1 ring-slate-200"><svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]"><rect x="5" y="5" width="14" height="14" rx="4" /><circle cx="12" cy="12" r="3.2" /><circle cx="16.5" cy="7.5" r="0.8" fill="currentColor" stroke="none" /></svg></span>
  }
  if (kind === "fb") {
    return <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 ring-1 ring-slate-200"><svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]"><path d="M13.5 20v-7h2.3l.5-3h-2.8V8.3c0-.9.4-1.8 1.9-1.8H16V4.1c-.4-.1-1.2-.2-2.2-.2-2.4 0-4 1.4-4 4.1V10H7.5v3h2.3v7" /></svg></span>
  }
  if (kind === "yt") {
    return <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 ring-1 ring-slate-200"><svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]"><path d="M20 8.8a2.3 2.3 0 0 0-1.6-1.6C17 6.8 12 6.8 12 6.8s-5 0-6.4.4A2.3 2.3 0 0 0 4 8.8c-.4 1.4-.4 3.2-.4 3.2s0 1.8.4 3.2a2.3 2.3 0 0 0 1.6 1.6c1.4.4 6.4.4 6.4.4s5 0 6.4-.4a2.3 2.3 0 0 0 1.6-1.6c.4-1.4.4-3.2.4-3.2s0-1.8-.4-3.2Z" /><path d="m10 15.2 4.2-3.2L10 8.8v6.4Z" fill="currentColor" stroke="none" /></svg></span>
  }
  return <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 ring-1 ring-slate-200"><svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]"><path d="M14 10.5a3.4 3.4 0 1 0 0 3" /><path d="M9.5 8.5v7M14.5 8.5v7M6 8.5v7M18 8.5v7" /></svg></span>
}
