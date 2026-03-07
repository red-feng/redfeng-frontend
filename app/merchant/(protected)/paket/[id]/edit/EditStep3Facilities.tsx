import { getFacilityIcon } from "@/lib/facility-icons"
import { updatePackageStep3 } from "../../actions"

type Facility = {
  id: string
  name: string
}

export default function EditStep3Facilities({
  packageId,
  facilities,
  selectedFacilityIds,
}: {
  packageId: string
  facilities: Facility[]
  selectedFacilityIds: string[]
}) {
  return (
    <form action={updatePackageStep3} className="space-y-10">
      <input type="hidden" name="package_id" value={packageId} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {facilities.map((facility) => (
          <label
            key={facility.id}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:bg-orange-50"
          >
            <input
              type="checkbox"
              name="facility_ids[]"
              value={facility.id}
              defaultChecked={selectedFacilityIds.includes(facility.id)}
              className="h-5 w-5 accent-orange-500"
            />
            <span className="text-lg leading-none">{getFacilityIcon(facility.name)}</span>
            <span className="text-slate-700">{facility.name}</span>
          </label>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <a
          href={`?step=2`}
          className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
        >
          Kembali
        </a>
        <button
          type="submit"
          className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Simpan & Lanjut
        </button>
      </div>
    </form>
  )
}
