"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import type { DivIcon } from "leaflet"
import L from "leaflet"
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet"
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

function ActiveMarkerOverlay({
  activeMarker,
}: {
  activeMarker: {
    id: string
    lat: number
    lng: number
    content: ReactNode
  }
}) {
  const map = useMap()
  const [position, setPosition] = useState(() => map.latLngToContainerPoint([activeMarker.lat, activeMarker.lng]))

  useEffect(() => {
    const updatePosition = () => {
      setPosition(map.latLngToContainerPoint([activeMarker.lat, activeMarker.lng]))
    }

    updatePosition()
    map.on("move zoom resize", updatePosition)
    return () => {
      map.off("move zoom resize", updatePosition)
    }
  }, [activeMarker.lat, activeMarker.lng, map])

  return (
    <div
      className="pointer-events-none absolute z-[950]"
      style={{
        left: position.x,
        top: position.y - 56,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="pointer-events-auto relative">
        {activeMarker.content}
        <div
          className="absolute left-1/2 top-full h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white shadow-[0_18px_30px_-24px_rgba(15,23,42,0.28)]"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

export default function ActiveResultsMap({
  bbox,
  markers,
  activeMarker,
  onBoundsChange,
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
            click: () => {
              onSelectMarker(point.id)
            },
          }}
        />
      ))}
      {activeMarker ? <ActiveMarkerOverlay key={activeMarker.id} activeMarker={activeMarker} /> : null}
    </MapContainer>
  )
}
