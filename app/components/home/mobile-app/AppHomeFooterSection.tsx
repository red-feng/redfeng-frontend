import Image from "next/image"
import Link from "next/link"

import {
  ChevronDownIcon,
  partnerLogos,
  payments,
  ShieldCheckIcon,
  whyChoose,
} from "@/app/components/home/shared/homeContent"

const appFooterLinks = [
  { title: "Perusahaan", items: ["Tentang Kami", "Karir", "Kontak Kami"] },
  { title: "Bantuan", items: ["Pusat Bantuan", "Cara Pemesanan", "Kebijakan Privasi"] },
  { title: "Partner", items: ["Jadi Partner", "Affiliate", "Kerja Sama Korporat"] },
]

export default function AppHomeFooterSection() {
  return (
    <section className="standalone-home-footer mx-auto max-w-xl px-4 pb-[calc(env(safe-area-inset-bottom)+7.25rem)] pt-2">
      <div className="overflow-hidden rounded-[30px] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf7_52%,#ffffff_100%)] px-4 py-5 shadow-[0_28px_48px_-36px_rgba(15,23,42,0.22)] ring-1 ring-[#edf1f6]">
        <div className="grid grid-cols-3 gap-2 rounded-[24px] bg-[linear-gradient(135deg,#fffaf7_0%,#fffefc_50%,#f9fcff_100%)] p-2 ring-1 ring-[#f3ece6]">
          <TrustMiniCard
            title="Traveler percaya"
            body="50.000+ pengguna"
            accent="text-[#ef5b2a]"
            footer="4.9/5 rating"
            icon={<ShieldCheckIcon className="h-4.5 w-4.5" />}
          />
          <PartnerMiniCard />
          <PaymentMiniCard />
        </div>

        <div className="mt-5 rounded-[26px] bg-[linear-gradient(180deg,#fff9f6_0%,#ffffff_100%)] p-4 shadow-[0_20px_34px_-30px_rgba(15,23,42,0.14)] ring-1 ring-[#f4e8df]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ef5b2a]">Mengapa RedFeng</p>
              <h2 className="mt-1 text-[14px] font-semibold leading-[1.32] tracking-normal text-slate-950 lg:text-[15px]">Nyaman dipakai, aman dipesan</h2>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {whyChoose.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="rounded-[18px] bg-[linear-gradient(180deg,#ffffff_0%,#fffdfa_100%)] px-3 py-3.5 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.16)] ring-1 ring-[#eef2f7]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#fff3eb_0%,#fffaf7_100%)] text-[#ef6b35] ring-1 ring-[#ffe3d5]">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="mt-3 text-[13px] font-semibold leading-5 text-slate-950">{item.title}</h3>
                  <p className="mt-1.5 text-[11px] leading-5 text-slate-500">{item.body}</p>
                </article>
              )
            })}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,#fff5ef_0%,#fffdfb_58%,#f6fbff_100%)] px-4 py-4 shadow-[0_22px_38px_-32px_rgba(15,23,42,0.16)] ring-1 ring-[#eef2f7]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-900">Butuh bantuan?</p>
              <h3 className="mt-1 text-[14px] font-semibold leading-[1.32] tracking-normal text-slate-950 lg:text-[15px]">Tim RedFeng siap membantu 24/7</h3>
              <p className="mt-2 text-[12px] leading-5 text-slate-500">Buka pusat bantuan, cek metode pembayaran, atau hubungi kami kapan saja.</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#eef8ff_0%,#f9fcff_100%)] text-sky-500 ring-1 ring-[#d8ecff]">
              <ShieldCheckIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Link
              href="/bantuan"
              className="inline-flex items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#ff6a45_0%,#ef5b2a_100%)] px-3.5 py-3 text-[12px] font-semibold text-white shadow-[0_18px_30px_-22px_rgba(239,91,42,0.52)]"
            >
              Hubungi Kami
            </Link>
            <Link
              href="/privacy"
              className="inline-flex items-center justify-center rounded-[16px] bg-white px-3.5 py-3 text-[12px] font-semibold text-slate-700 ring-1 ring-[#e7edf4]"
            >
              Kebijakan
            </Link>
          </div>
        </div>

        <div className="mt-5 rounded-[26px] border border-[#edf1f6] bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] px-4 py-4 shadow-[0_18px_30px_-30px_rgba(15,23,42,0.14)]">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/home-assets/logo-redfeng-header.png"
              alt="RedFeng"
              width={1536}
              height={1024}
              quality={100}
              unoptimized
              className="h-12 w-auto"
            />
            <div>
              <h3 className="text-[17px] font-bold tracking-[-0.03em] text-slate-950">RedFeng</h3>
              <p className="mt-0.5 max-w-[13rem] text-[12px] leading-5 text-slate-500">Platform travel untuk kebutuhan perjalanan yang lebih praktis.</p>
            </div>
          </Link>

          <div className="mt-4 flex gap-2.5 text-slate-500">
            <SocialIcon kind="ig" />
            <SocialIcon kind="fb" />
            <SocialIcon kind="yt" />
            <SocialIcon kind="tt" />
          </div>

          <div className="mt-4 border-t border-[#eef2f7]">
            {appFooterLinks.map((group) => (
              <FooterAccordionRow key={group.title} title={group.title} />
            ))}
            <FooterAccordionRow title="Metode Pembayaran" />
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-400">&copy; 2026 RedFeng. All rights reserved.</p>
        </div>
      </div>
    </section>
  )
}

function TrustMiniCard({
  title,
  body,
  footer,
  accent,
  icon,
}: {
  title: string
  body: string
  footer: string
  accent: string
  icon: React.ReactNode
}) {
  return (
    <article className="rounded-[18px] bg-[linear-gradient(180deg,#ffffff_0%,#fffdfa_100%)] px-3 py-3.5 shadow-[0_14px_24px_-24px_rgba(15,23,42,0.1)] ring-1 ring-[#f4e7de]">
      <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffffff_0%,#fff8f3_100%)] ${accent} shadow-[0_10px_20px_-16px_rgba(15,23,42,0.18)] ring-1 ring-[#f7e8dd]`}>{icon}</div>
      <h3 className="mt-3 text-[11px] font-semibold leading-4 text-slate-900">{title}</h3>
      <p className="mt-1 text-[10px] leading-4 text-slate-500">{body}</p>
      <p className="mt-3 text-[11px] font-bold text-slate-900">{footer}</p>
    </article>
  )
}

function PartnerMiniCard() {
  return (
    <article className="rounded-[18px] bg-[linear-gradient(180deg,#fffdf9_0%,#ffffff_100%)] px-3 py-3.5 shadow-[0_14px_24px_-24px_rgba(15,23,42,0.1)] ring-1 ring-[#f3ece4]">
      <h3 className="text-[11px] font-semibold leading-4 text-slate-900">Partner resmi</h3>
      <div className="mt-3 space-y-2.5">
        {partnerLogos.slice(0, 4).map((logo, index) =>
          logo.kind === "image" ? (
            <Image key={logo.alt} src={logo.src} alt={logo.alt} width={180} height={40} className="h-3.5 w-auto object-contain" />
          ) : (
            <p
              key={logo.label}
              className={`text-[10px] italic tracking-[-0.03em] ${
                index === 1 ? "font-black text-[#ef3b2d]" : index === 2 ? "font-black text-[#38a169]" : "font-medium text-[#4c51bf]"
              }`}
            >
              {logo.label}
            </p>
          ),
        )}
      </div>
    </article>
  )
}

function PaymentMiniCard() {
  return (
    <article className="rounded-[18px] bg-[linear-gradient(180deg,#f8fcff_0%,#ffffff_100%)] px-3 py-3.5 shadow-[0_14px_24px_-24px_rgba(15,23,42,0.1)] ring-1 ring-[#e8f1fa]">
      <h3 className="text-[11px] font-semibold leading-4 text-slate-900">Pembayaran aman</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {payments.slice(0, 6).map((payment) => (
          <span key={payment.label} className="inline-flex h-8 items-center justify-center rounded-[10px] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-2 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.14)] ring-1 ring-[#edf2f7]">
            {payment.src ? (
              <Image
                src={payment.src}
                alt={payment.label}
                width={payment.width ?? 96}
                height={payment.height ?? 24}
                className="h-3.5 w-auto object-contain"
                style={{ transform: `scale(${payment.mobileScale ?? 1})` }}
              />
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-700">{payment.label}</span>
            )}
          </span>
        ))}
      </div>
    </article>
  )
}

function FooterAccordionRow({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#eef2f7] py-3.5 last:border-b-0">
      <span className="text-[14px] font-semibold text-slate-900">{title}</span>
      <ChevronDownIcon className="h-4 w-4 text-slate-600" />
    </div>
  )
}

function SocialIcon({ kind }: { kind: "ig" | "fb" | "yt" | "tt" }) {
  if (kind === "ig") {
    return <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.18)]"><svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-none stroke-current stroke-[1.8]"><rect x="5" y="5" width="14" height="14" rx="4" /><circle cx="12" cy="12" r="3.2" /><circle cx="16.5" cy="7.5" r="0.8" fill="currentColor" stroke="none" /></svg></span>
  }
  if (kind === "fb") {
    return <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.18)]"><svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-none stroke-current stroke-[1.8]"><path d="M13.5 20v-7h2.3l.5-3h-2.8V8.3c0-.9.4-1.8 1.9-1.8H16V4.1c-.4-.1-1.2-.2-2.2-.2-2.4 0-4 1.4-4 4.1V10H7.5v3h2.3v7" /></svg></span>
  }
  if (kind === "yt") {
    return <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.18)]"><svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-none stroke-current stroke-[1.8]"><path d="M20 8.8a2.3 2.3 0 0 0-1.6-1.6C17 6.8 12 6.8 12 6.8s-5 0-6.4.4A2.3 2.3 0 0 0 4 8.8c-.4 1.4-.4 3.2-.4 3.2s0 1.8.4 3.2a2.3 2.3 0 0 0 1.6 1.6c1.4.4 6.4.4 6.4.4s5 0 6.4-.4a2.3 2.3 0 0 0 1.6-1.6c.4-1.4.4-3.2.4-3.2s0-1.8-.4-3.2Z" /><path d="m10 15.2 4.2-3.2L10 8.8v6.4Z" fill="currentColor" stroke="none" /></svg></span>
  }
  return <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.18)]"><svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-none stroke-current stroke-[1.8]"><path d="M14 10.5a3.4 3.4 0 1 0 0 3" /><path d="M9.5 8.5v7M14.5 8.5v7M6 8.5v7M18 8.5v7" /></svg></span>
}
