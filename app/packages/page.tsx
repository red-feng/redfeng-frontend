import { getCurrentLocale } from "@/lib/locale"

export default async function PackagesPage() {
  const locale = await getCurrentLocale()
  const isId = locale === "id"
  return <div>{isId ? "Halaman Paket Sementara" : "Temporary Packages Page"}</div>
}
