import { createClient } from "@/lib/supabase/server"
import { createPackage } from "./actions"
import Image from "next/image"

export default async function Step1Basic() {
  const supabase = await createClient()

  const { data: countries } = await supabase
    .from("countries")
    .select("id, name")
    .order("name")

  return (
    <div className="relative min-h-screen">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/bg-wizard.png')" }}
      />

      <div className="relative z-10">
        <div className="px-8 py-6">
          <Image
            src="/logo-redfeng.png"
            alt="Red Feng"
            width={0}
            height={0}
            sizes="100vw"
            className="h-32 w-auto"
            priority
          />
        </div>

        <div className="flex justify-center px-8 pb-28">
          <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-14">

            <h1 className="text-2xl font-bold mb-1">
              Buat Paket Baru
            </h1>

            <p className="text-gray-500 mb-8">
              Step 1 – Basic Info
            </p>

            <form
              action={createPackage}
              encType="multipart/form-data"
              className="space-y-6"
            >

              <input
                name="title"
                placeholder="Nama Paket"
                className="border rounded-lg p-3 w-full"
                required
              />

              {/* COUNTRY (RELATIONAL) */}
              <select
                name="country_id"
                className="border rounded-lg p-3 w-full"
                required
              >
                <option value="">Pilih Negara</option>
                {countries?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                name="travel_style"
                className="border rounded-lg p-3 w-full"
                required
              >
                <option value="">Pilih Travel Style</option>
                <option value="explore">Explore</option>
                <option value="adventure">Adventure</option>
                <option value="family">Family</option>
                <option value="luxury">Luxury</option>
                <option value="honeymoon">Honeymoon</option>
                <option value="wellness">Wellness</option>
                <option value="religious">Religious</option>
                <option value="budget">Budget</option>
                <option value="group">Group</option>
                <option value="solo">Solo</option>
              </select>

              <div className="grid grid-cols-2 gap-4">

                <input
                  name="province"
                  placeholder="Provinsi"
                  className="border rounded-lg p-3 w-full"
                  required
                />

                <input
                  name="minimal_peserta"
                  type="number"
                  placeholder="Minimal Peserta"
                  className="border rounded-lg p-3 w-full"
                  required
                />

                <input
                  name="duration_days"
                  type="number"
                  placeholder="Durasi (hari)"
                  className="border rounded-lg p-3 w-full"
                  required
                />

                <input
                  name="price_adult"
                  type="number"
                  placeholder="Harga Dewasa"
                  className="border rounded-lg p-3 w-full"
                  required
                />

                <input
                  name="price_child"
                  type="number"
                  placeholder="Harga Anak"
                  className="border rounded-lg p-3 w-full"
                />

                <select name="currency" defaultValue="IDR">
                <option value="IDR">IDR</option>
                <option value="USD">USD</option>
                <option value="CNY">CNY</option>
                <option value="EUR">EUR</option>
              </select>

              </div>

              <div>
                <label className="block font-medium mb-2">
                  Foto Sampul
                </label>
                <input
                  type="file"
                  name="cover_image"
                  accept="image/*"
                  className="border rounded-lg p-3 w-full"
                  required
                />
              </div>

              <div className="flex justify-center pt-6">
                <button
                  type="submit"
                  className="px-12 py-3 rounded-xl font-semibold 
                  bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300
                  text-white shadow-lg hover:scale-105 transition-all"
                >
                  Simpan & Lanjut
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  )
}