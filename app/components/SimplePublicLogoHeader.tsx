import Image from "next/image"
import Link from "next/link"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"

export default function SimplePublicLogoHeader() {
  return (
    <header className={`${homeLayoutLock.pageXClass} pt-5 md:pt-6`}>
      <div className={`${homeLayoutLock.contentWidthClass} flex items-center`}>
        <Link href="/" className="inline-flex items-center" aria-label="Back to Red Feng homepage">
          <Image
            src="/home-assets/logo-redfeng-header.png"
            alt="Red Feng"
            width={1536}
            height={1024}
            priority
            className="h-14 w-auto object-contain object-left sm:h-16 lg:h-[4.5rem]"
          />
        </Link>
      </div>
    </header>
  )
}
