import Image from "next/image"
import Link from "next/link"
import { ChevronDownIcon, payments } from "@/app/components/home/homeContent"

export default function HomeFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-[1240px] px-4 pb-8 pt-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[1.25fr_0.72fr_0.72fr_0.72fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <Image src="/home-assets/logo-redfeng-header.png" alt="RedFeng" width={240} height={80} className="h-[3.4rem] w-auto" />
            </Link>
            <p className="mt-4 max-w-sm text-[13px] leading-6 text-slate-500">
              Platform perjalanan terlengkap untuk semua kebutuhan Anda. Booking mudah, cepat, dan aman.
            </p>
            <div className="mt-4 flex gap-3 text-slate-500">
              <SocialIcon kind="ig" />
              <SocialIcon kind="fb" />
              <SocialIcon kind="yt" />
              <SocialIcon kind="tt" />
            </div>
          </div>

          <div className="hidden xl:contents">
            <FooterColumn title="Perusahaan" items={["Tentang Kami", "Karir", "Blog", "Kontak Kami"]} />
            <FooterColumn title="Bantuan" items={["Pusat Bantuan", "Cara Pemesanan", "Pembayaran", "Kebijakan & Privasi"]} />
            <FooterColumn title="Partner" items={["Jadi Partner", "Affiliate", "Kerja Sama Korporat"]} />
          </div>

          <div className="hidden xl:block">
            <h3 className="text-[15px] font-bold">Metode Pembayaran</h3>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {payments.slice(0, 10).map((payment) => (
                <span
                  key={payment}
                  className="inline-flex h-8 items-center justify-center rounded-md bg-white px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 ring-1 ring-slate-200"
                >
                  {payment}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 xl:hidden">
          <FooterAccordionRow title="Perusahaan" />
          <FooterAccordionRow title="Bantuan" />
          <FooterAccordionRow title="Partner" />
          <FooterAccordionRow title="Metode Pembayaran" />
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-5 text-center text-[12px] text-slate-400 md:flex-row md:items-center md:justify-between md:text-left">
          <p>&copy; 2026 RedFeng. All rights reserved.</p>
          <div className="hidden gap-5 md:flex">
            <a href="/terms" className="hover:text-slate-700">Syarat & Ketentuan</a>
            <a href="/privacy" className="hover:text-slate-700">Kebijakan Privasi</a>
          </div>
        </div>
      </div>
    </footer>
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

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-[15px] font-bold">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-[13px] text-slate-500">
        {items.map((item) => (
          <li key={item}>
            <a href="#" className="hover:text-slate-800">{item}</a>
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
