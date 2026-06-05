"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import type { DivIcon } from "leaflet"
import L from "leaflet"
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"

type MarkerPoint = {
  id: string
  lat: number
  lng: number
  label: string
  priceLabel: string
  active: boolean
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function createPriceIcon(point: MarkerPoint): DivIcon {
  const label = escapeHtml(point.label)
  const priceLabel = escapeHtml(point.priceLabel)
  return L.divIcon({
    className: "rf-map-price-icon",
    html: `
      <div class="rf-map-price-chip${point.active ? " is-active" : ""}">
        <span>${priceLabel}</span>
      </div>
      <div class="rf-map-price-dot${point.active ? " is-active" : ""}"></div>
      <div class="rf-map-price-label${point.active ? " is-active" : ""}">${label}</div>
    `,
    iconSize: [132, 62],
    iconAnchor: [66, 48],
  })
}

function bboxToBounds(bbox: string): [[number, number], [number, number]] {
  const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number)
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ]
}

function boundsToBBox(bounds: L.LatLngBounds) {
  const southWest = bounds.getSouthWest()
  const northEast = bounds.getNorthEast()
  return `${southWest.lng},${southWest.lat},${northEast.lng},${northEast.lat}`
}

function BoundsSync({
  bbox,
  onBoundsChange,
}: {
  bbox: string
  onBoundsChange?: ((bbox: string) => void) | null
}) {
  const map = useMap()

  useEffect(() => {
    const nextBounds = L.latLngBounds(bboxToBounds(bbox))
    const currentBounds = map.getBounds()
    const currentBbox = boundsToBBox(currentBounds)
    if (currentBbox === bbox) return
    map.fitBounds(nextBounds, { padding: [36, 36], animate: false })
  }, [bbox, map])

  useMapEvents({
    moveend() {
      onBoundsChange?.(boundsToBBox(map.getBounds()))
    },
    zoomend() {
      onBoundsChange?.(boundsToBBox(map.getBounds()))
    },
  })

  return null
}

export default function ActiveResultsMap({
  bbox,
  markers,
  activeMarker,
  onBoundsChange,
  onClearSelection,
  onSelectMarker,
}: {
  bbox: string
  markers: MarkerPoint[]
  activeMarker?: {
    id: string
    lat: number
    lng: number
    content: ReactNode
  } | null
  onBoundsChange?: ((bbox: string) => void) | null
  onClearSelection?: (() => void) | null
  onSelectMarker: (markerId: string) => void
}) {
  return (
    <MapContainer
      bounds={bboxToBounds(bbox)}
      boundsOptions={{ padding: [36, 36] }}
      className="absolute inset-0 h-full w-full"
      zoomControl={false}
      scrollWheelZoom
      minZoom={3}
      worldCopyJump
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BoundsSync bbox={bbox} onBoundsChange={onBoundsChange} />
      {markers.map((point) => (
        <Marker
          key={point.id}
          position={[point.lat, point.lng]}
          icon={createPriceIcon(point)}
          eventHandlers={{
            click: () => onSelectMarker(point.id),
          }}
        />
      ))}
      {activeMarker ? (
        <Popup
          position={[activeMarker.lat, activeMarker.lng]}
          closeButton={false}
          autoClose={false}
          closeOnClick={false}
          autoPan={false}
          offset={[0, -44]}
          className="rf-map-preview-popup"
          eventHandlers={{
            remove: () => onClearSelection?.(),
          }}
        >
          {activeMarker.content}
        </Popup>
      ) : null}
    </MapContainer>
  )
}
