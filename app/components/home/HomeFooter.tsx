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
              <Image src="/home-assets/logo-redfeng-header.png" alt="RedFeng" width={240} height={80} className="h-10 w-auto" />
            </Link>
            <p className="mt-4 max-w-sm text-[13px] leading-6 text-slate-500">
              Platform perjalanan terlengkap untuk semua kebutuhan Anda. Booking mudah, cepat, dan aman.
            </p>
            <div className="mt-4 flex gap-3 text-slate-500">
              <SocialCircle label="ig" />
              <SocialCircle label="fb" />
              <SocialCircle label="yt" />
              <SocialCircle label="tt" />
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

function SocialCircle({ label }: { label: string }) {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-[10px] font-bold uppercase">
      {label}
    </span>
  )
}
