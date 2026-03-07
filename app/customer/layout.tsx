import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import SignOutButton from "@/app/components/SignOutButton"

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=/customer/dashboard")
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-10">
          <Link href="/customer/dashboard" className="inline-flex items-center">
            <Image
              src="/logo-redfeng.png"
              alt="RedFeng"
              width={220}
              height={64}
              priority
              className="h-14 w-auto md:h-16"
            />
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Link href="/customer/dashboard" className="rounded-full border border-slate-200 px-4 py-2 font-medium hover:border-orange-300 hover:text-orange-600">
              Dashboard Customer
            </Link>
            <Link href="/" className="rounded-full border border-slate-200 px-4 py-2 font-medium hover:border-orange-300 hover:text-orange-600">
              Kembali ke Situs
            </Link>
            <SignOutButton className="rounded-full border border-slate-200 px-4 py-2 font-medium hover:border-rose-300 hover:text-rose-600" />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </div>
  )
}
