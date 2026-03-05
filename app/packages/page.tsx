import { getCurrentLocale } from "@/lib/locale"
import { dictionaries } from "@/lib/i18n"

export default async function PackagesPage() {
  const locale = await getCurrentLocale()
  return <div>{dictionaries[locale].packagesPage.tempTitle}</div>
}
