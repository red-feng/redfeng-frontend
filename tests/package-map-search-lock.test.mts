import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import assert from "node:assert/strict"

const searchBarPath = resolve("app/components/SearchBar.tsx")
const filterClientPath = resolve("app/packages/FilterClient.tsx")

const searchBarSource = readFileSync(searchBarPath, "utf8")
const filterClientSource = readFileSync(filterClientPath, "utf8")

const searchStartMarker = "// PROTECTED-PACKAGE-MAP-SEARCHBAR-START"
const searchEndMarker = "// PROTECTED-PACKAGE-MAP-SEARCHBAR-END"
const mapStartMarker = "// PROTECTED-PACKAGE-MAP-RESULTS-START"
const mapEndMarker = "// PROTECTED-PACKAGE-MAP-RESULTS-END"

const searchStartIndex = searchBarSource.indexOf(searchStartMarker)
const searchEndIndex = searchBarSource.indexOf(searchEndMarker)
assert.notEqual(searchStartIndex, -1, "Missing protected start marker for package map search bar.")
assert.notEqual(searchEndIndex, -1, "Missing protected end marker for package map search bar.")
assert.ok(searchStartIndex < searchEndIndex, "Protected markers for package map search bar are out of order.")

const mapStartIndex = filterClientSource.indexOf(mapStartMarker)
const mapEndIndex = filterClientSource.indexOf(mapEndMarker)
assert.notEqual(mapStartIndex, -1, "Missing protected start marker for package map results.")
assert.notEqual(mapEndIndex, -1, "Missing protected end marker for package map results.")
assert.ok(mapStartIndex < mapEndIndex, "Protected markers for package map results are out of order.")

const searchRegion = searchBarSource.slice(searchStartIndex, searchEndIndex)
const mapRegion = filterClientSource.slice(mapStartIndex, mapEndIndex)

const requiredSearchAnchors = [
  'const params = new URLSearchParams(searchParams.toString())',
  'if (isMapCompactVariant) params.set("map", "1")',
  'params.delete("departure_date")',
  'params.delete("page")',
  'router.push(nextQuery ? `${targetPath}?${nextQuery}` : targetPath, { scroll: false })',
]

for (const anchor of requiredSearchAnchors) {
  assert.ok(searchRegion.includes(anchor), `Package map search bar lock failed. Missing anchor: ${anchor}`)
}

const requiredMapAnchors = [
  "const mapReadyPackages = mapModalPackages.filter((pkg) => Boolean(getPreviewMapPoint(pkg, selectedCountry)))",
  "const useActiveResultMap = mapReadyPackages.length > 0",
  "const activeResultBaseWindow = useActiveResultMap ? buildPackageMapWindow(mapReadyPackages, selectedCountry) : mapWindow",
  "const visibleGeoPackages = useActiveResultMap",
  "const resolvedGeoMarkers = useActiveResultMap ? buildPackageMarkerLayout(visibleGeoPackages, activeViewportBBox, selectedCountry) : []",
  "const resolvedActiveMapPackages = useActiveResultMap ? resolvedGeoMarkers.map((entry) => entry.pkg) : activeMapPackages",
  "const resolvedActiveMapPackageCount = useActiveResultMap ? resolvedGeoMarkers.length : activeMapPackageCount",
  '"Peta sekarang mengikuti paket yang cocok dengan pencarian aktifmu."',
  '`Viewport saat ini menampilkan ${resolvedActiveMapPackageCount} titik paket yang nyata`',
]

for (const anchor of requiredMapAnchors) {
  assert.ok(mapRegion.includes(anchor), `Package map results lock failed. Missing anchor: ${anchor}`)
}

const orderedMapAnchors = [
  "const mapReadyPackages = mapModalPackages.filter((pkg) => Boolean(getPreviewMapPoint(pkg, selectedCountry)))",
  "const useActiveResultMap = mapReadyPackages.length > 0",
  "const activeResultBaseWindow = useActiveResultMap ? buildPackageMapWindow(mapReadyPackages, selectedCountry) : mapWindow",
  "const visibleGeoPackages = useActiveResultMap",
  "const resolvedGeoMarkers = useActiveResultMap ? buildPackageMarkerLayout(visibleGeoPackages, activeViewportBBox, selectedCountry) : []",
  "const resolvedActiveMapPackages = useActiveResultMap ? resolvedGeoMarkers.map((entry) => entry.pkg) : activeMapPackages",
  "const resolvedActiveMapPackageCount = useActiveResultMap ? resolvedGeoMarkers.length : activeMapPackageCount",
]

let previousIndex = -1
for (const anchor of orderedMapAnchors) {
  const currentIndex = mapRegion.indexOf(anchor)
  assert.notEqual(currentIndex, -1, `Missing ordered package map anchor: ${anchor}`)
  assert.ok(currentIndex > previousIndex, `Package map structure changed unexpectedly around anchor: ${anchor}`)
  previousIndex = currentIndex
}

console.log("package-map-search-lock: ok")
