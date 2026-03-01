export default function SearchBar() {
  return (
    <div className="bg-white border-b shadow-sm px-8 py-4">
      <div className="max-w-[1360px] mx-auto flex gap-4 items-center">
        <input
          placeholder="Bandung"
          className="flex-1 border rounded-xl px-4 py-3"
        />

        <input
          placeholder="02 Mar - 03 Mar"
          className="border rounded-xl px-4 py-3 w-[220px]"
        />

        <input
          placeholder="2 Dewasa"
          className="border rounded-xl px-4 py-3 w-[180px]"
        />

        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl">
          Cari
        </button>
      </div>
    </div>
  )
}