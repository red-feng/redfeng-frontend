export default function SortBar({ total }: { total: number }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border flex justify-between items-center mb-6">
      <div>
        <div className="text-lg font-semibold">
          {total} paket ditemukan
        </div>
      </div>

      <div className="flex gap-3">
        <button className="border px-4 py-2 rounded-full text-sm bg-gray-50">
          Popularitas tertinggi
        </button>
        <button className="border px-4 py-2 rounded-full text-sm bg-gray-50">
          Harga terendah
        </button>
      </div>
    </div>
  )
}