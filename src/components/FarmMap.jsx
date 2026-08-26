import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import { useAppContext } from '../context/AppContext'

// Fix default marker icons (Leaflet + Vite issue)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom marker icons
const createIcon = (color) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:50%;background:#fff;transform:rotate(45deg);"></div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
})

const userIcon = createIcon('#3E7CB1')
const farmIcon = createIcon('#2F7D4F')
const marketIcon = createIcon('#E2A72E')

// Recenter map component
function RecenterMap({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], map.getZoom())
  }, [lat, lng, map])
  return null
}

export default function FarmMap({
  height = 300,
  markers = [],
  boundaries = [],
  showUserLocation = true,
  interactive = true,
  zoom = 14,
  onMapClick,
  className = '',
}) {
  const { t } = useTranslation()
  const { location } = useAppContext()

  const center = useMemo(() => {
    if (location?.lat && location?.lng) return [location.lat, location.lng]
    return [20.5937, 78.9629] // India center fallback
  }, [location?.lat, location?.lng])

  if (!location?.lat) {
    return (
      <div className={`card overflow-hidden ${className}`} style={{ height }}>
        <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--color-rain-soft)' }}>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('common.loading')}...</p>
        </div>
      </div>
    )
  }

  // Convert GeoJSON coordinates to Leaflet format [lat, lng]
  const convertCoords = (geojson) => {
    try {
      if (geojson.type === 'Polygon' && geojson.coordinates) {
        return geojson.coordinates[0].map(([lng, lat]) => [lat, lng])
      }
    } catch { /* */ }
    return []
  }

  return (
    <div className={`card overflow-hidden ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap lat={center[0]} lng={center[1]} />

        {/* Field boundary polygons */}
        {boundaries.map((b, i) => {
          const positions = convertCoords(b.geojson)
          if (positions.length === 0) return null
          return (
            <Polygon
              key={`boundary-${b.farmId}-${i}`}
              positions={positions}
              pathOptions={{
                color: b.isSelected ? '#2F7D4F' : '#6B8E6B',
                weight: b.isSelected ? 3 : 2,
                fillColor: b.isSelected ? '#2F7D4F' : '#6B8E6B',
                fillOpacity: b.isSelected ? 0.2 : 0.1,
                dashArray: b.isSelected ? '' : '5,5',
              }}
            />
          )
        })}

        {/* User location marker */}
        {showUserLocation && location?.lat && (
          <Marker position={[location.lat, location.lng]} icon={userIcon}>
            <Popup>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>
                <strong>📍 {t('location.your_location')}</strong><br />
                {location.display || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Additional markers */}
        {markers.map((m, i) => (
          <Marker
            key={i}
            position={[m.lat, m.lng]}
            icon={m.type === 'market' ? marketIcon : farmIcon}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>
                <strong>{m.icon || '📌'} {m.title}</strong>
                {m.subtitle && <><br /><span style={{ color: '#7A6F60' }}>{m.subtitle}</span></>}
              </div>
            </Popup>
          </Marker>
        ))}

        {onMapClick && <MapClickHandler onClick={onMapClick} />}
      </MapContainer>
    </div>
  )
}

function MapClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng) })
  return null
}
