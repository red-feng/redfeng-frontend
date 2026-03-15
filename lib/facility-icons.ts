export function getFacilityIcon(facilityName: string | null | undefined): string {
  const name = (facilityName || "").toLowerCase()

  if (name.includes("hotel") || name.includes("kamar")) return "🏨"
  if (name.includes("sarapan") || name.includes("restoran") || name.includes("halal")) return "🍽️"
  if (name.includes("bandara") || name.includes("driver") || name.includes("kendaraan") || name.includes("transportasi")) return "🚐"
  if (name.includes("pesawat") || name.includes("kereta") || name.includes("kapal") || name.includes("transport")) return "✈️"
  if (name.includes("tour guide") || name.includes("guide") || name.includes("tour leader")) return "🧭"
  if (name.includes("dokumentasi") || name.includes("foto") || name.includes("video")) return "📸"
  if (name.includes("asuransi") || name.includes("perlindungan") || name.includes("proteksi")) return "🛡️"
  if (name.includes("visa")) return "🛂"
  if (name.includes("air mineral")) return "💧"
  if (name.includes("makan siang") || name.includes("makan malam")) return "🍴"
  if (name.includes("parkir") || name.includes("tol")) return "🛣️"

  return "✅"
}
