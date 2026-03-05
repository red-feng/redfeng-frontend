export function getFacilityIcon(facilityName: string | null | undefined): string {
  const name = (facilityName || "").toLowerCase()

  if (name.includes("hotel") || name.includes("kamar")) return "🏨"
  if (name.includes("sarapan") || name.includes("restoran") || name.includes("halal")) return "🍽️"
  if (name.includes("bandara") || name.includes("driver") || name.includes("kendaraan")) return "🚐"
  if (name.includes("pesawat") || name.includes("kereta") || name.includes("kapal")) return "✈️"
  if (name.includes("tour guide") || name.includes("guide")) return "🧭"
  if (name.includes("dokumentasi") || name.includes("foto") || name.includes("video")) return "📸"
  if (name.includes("snorkeling") || name.includes("rafting") || name.includes("wahana")) return "🏄"
  if (name.includes("asuransi") || name.includes("perlindungan")) return "🛡️"
  if (name.includes("visa")) return "🛂"
  if (name.includes("honeymoon") || name.includes("premium")) return "✨"

  return "✅"
}
