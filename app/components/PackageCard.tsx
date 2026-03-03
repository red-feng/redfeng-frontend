import Link from "next/link"

type PackageCardTranslation = {
  title: string | null
  description: string | null
}

type PackageCardData = {
  slug: string
  cover_image: string | null
  city: string | null
  country: string | null
  currency: string | null
  price_adult: number | null
  package_translations?: PackageCardTranslation[] | null
}

export default function PackageCard({ pkg }: { pkg: PackageCardData }) {
  
  const translation = pkg.package_translations?.[0]

  return (
    <div className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition flex overflow-hidden">
      {/* IMAGE */}
      <div className="w-[280px] h-[220px] relative shrink-0">
        <img
          src={pkg.cover_image}
          alt={translation?.title}
          className="w-full h-full object-cover"
        />

        {/* Promo Badge */}
        <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-3 py-1 rounded-full">
          Special Deal
        </div>
      </div>

      {/* DETAIL */}
      <div className="flex-1 p-6">
        <h2 className="text-lg font-semibold mb-1">
          {translation?.title}
        </h2>

        <div className="text-sm text-gray-500 mb-2">
          Location: {pkg.city}, {pkg.country}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
            8.4
          </div>
          <span className="text-sm text-gray-600">
            Excellent
          </span>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {translation?.description}
        </p>

        {/* Tags */}
        <div className="flex gap-2 flex-wrap text-xs">
          <span className="bg-gray-100 px-2 py-1 rounded">
            Free Cancellation
          </span>
          <span className="bg-gray-100 px-2 py-1 rounded">
            Breakfast Included
          </span>
        </div>
      </div>

      {/* PRICE */}
      <div className="w-[240px] border-l bg-gray-50 p-6 flex flex-col justify-between items-end">
        <div className="text-right">
          <div className="text-sm text-gray-500 line-through">
            {pkg.currency} {(pkg.price_adult * 1.2)?.toLocaleString()}
          </div>

          <div className="text-2xl font-bold text-orange-600">
            {pkg.currency} {pkg.price_adult?.toLocaleString()}
          </div>

          <div className="text-xs text-gray-500">
            Termasuk pajak & biaya
          </div>
        </div>

        <Link
          href={`/packages/${pkg.slug}`}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl text-center transition"
        >
          Pilih Paket
        </Link>
      </div>
    </div>
  )
}