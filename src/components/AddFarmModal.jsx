import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet'
import L from 'leaflet'
import * as turf from '@turf/turf'
import { X, MapPin, Save, Loader2 } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'

// Fix leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const SOIL_TYPES = [
  'Alluvial Clay', 'Red Sandy Loam', 'Black Cotton Soil', 'Laterite',
  'Red Soil', 'Sandy Soil', 'Clay Soil', 'Loamy Soil', 'Saline Soil',
]

const CROP_OPTIONS = [
  'Paddy', 'Wheat', 'Maize', 'Sugarcane', 'Cotton', 'Groundnut',
  'Soybean', 'Mustard', 'Turmeric', 'Brinjal', 'Tomato', 'Onion',
  'Potato', 'Chilli', 'Banana', 'Mango', 'Coconut', 'Tea', 'Coffee',
]

// Draw control setup — uses Leaflet.Draw directly
function DrawControl({ onPolygonCreated }) {
  const map = useMap()
  const drawControlRef = useRef(null)
  const drawnItemsRef = useRef(null)

  useEffect(() => {
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)
    drawnItemsRef.current = drawnItems

    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: { color: '#2F7D4F', weight: 3, fillColor: '#2F7D4F', fillOpacity: 0.2 },
        },
        polyline: false, circle: false, rectangle: false, marker: false, circlemarker: false,
      },
      edit: { featureGroup: drawnItems, remove: true },
    })
    map.addControl(drawControl)
    drawControlRef.current = drawControl

    map.on(L.Draw.Event.CREATED, (e) => {
      drawnItems.clearLayers()
      drawnItems.addLayer(e.layer)
      const geojson = e.layer.toGeoJSON().geometry
      onPolygonCreated?.(geojson)
    })

    map.on(L.Draw.Event.DELETED, () => {
      onPolygonCreated?.(null)
    })

    return () => {
      map.removeControl(drawControl)
      map.removeLayer(drawnItems)
    }
  }, [map, onPolygonCreated])

  return null
}

function RecenterMap({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], 16)
  }, [lat, lng, map])
  return null
}

export default function AddFarmModal({ isOpen, onClose, onSave, editFarm = null }) {
  const { t } = useTranslation()
  const { location } = useAppContext()
  const [name, setName] = useState('')
  const [crop, setCrop] = useState('')
  const [cropVariety, setCropVariety] = useState('')
  const [soilType, setSoilType] = useState('')
  const [sowingDate, setSowingDate] = useState('')
  const [growthStage, setGrowthStage] = useState('Sowing')
  const [polygon, setPolygon] = useState(null)
  const [area, setArea] = useState(0)
  const [centroid, setCentroid] = useState(null)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editFarm) {
      setName(editFarm.name || '')
      setSoilType(editFarm.soil_type || '')
      if (editFarm.boundary_geojson) {
        try {
          const geo = typeof editFarm.boundary_geojson === 'string'
            ? JSON.parse(editFarm.boundary_geojson) : editFarm.boundary_geojson
          setPolygon(geo)
          const poly = turf.polygon(geo.coordinates || [[]])
          setArea(turf.area(poly) / 4047)
          const c = turf.centroid(poly)
          setCentroid({ lat: c.geometry.coordinates[1], lng: c.geometry.coordinates[0] })
          setStep(2)
        } catch { /* */ }
      }
    }
  }, [editFarm])

  const center = centroid
    ? [centroid.lat, centroid.lng]
    : location?.lat ? [location.lat, location.lng]
      : [20.5937, 78.9629]

  const handlePolygonCreated = useCallback((geojson) => {
    if (!geojson) {
      setPolygon(null); setArea(0); setCentroid(null)
      return
    }
    setPolygon(geojson)
    try {
      const poly = turf.polygon(geojson.coordinates)
      setArea(turf.area(poly) / 4047)
      const c = turf.centroid(poly)
      setCentroid({ lat: c.geometry.coordinates[1], lng: c.geometry.coordinates[0] })
    } catch { setArea(0) }
  }, [])

  const proceedToDetails = () => {
    if (!polygon) { setError('Please draw your field boundary on the map first'); return }
    setError(''); setStep(2)
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('Field name is required'); return }
    if (!polygon) { setError('Draw field boundary first'); return }
    setSaving(true); setError('')

    const farmData = {
      name: name.trim(),
      lat: centroid?.lat || center[0],
      lng: centroid?.lng || center[1],
      area_ha: parseFloat((area * 0.4047).toFixed(2)),
      soil_type: soilType,
      boundary_geojson: JSON.stringify(polygon),
    }

    try {
      const url = editFarm ? `/api/farms.php?id=${editFarm.id}` : '/api/farms.php'
      const method = editFarm ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFarm ? { ...farmData, id: editFarm.id } : farmData),
      })
      const data = await res.json()

      if (data.success || data.id) {
        const farmId = data.id || editFarm?.id
        if (crop && !editFarm) {
          try {
            await fetch('/api/crops.php', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                farm_id: farmId, crop, variety: cropVariety,
                plant_date: sowingDate || new Date().toISOString().split('T')[0],
                stage: growthStage, area_ha: farmData.area_ha,
              }),
            })
          } catch { /* non-critical */ }
        }
        onSave?.(farmData); resetForm(); onClose()
      } else {
        setError(data.error || 'Failed to save')
      }
    } catch { setError('Network error — backend may be offline') }
    finally { setSaving(false) }
  }

  const resetForm = () => {
    setName(''); setCrop(''); setCropVariety(''); setSoilType('')
    setSowingDate(''); setGrowthStage('Sowing')
    setPolygon(null); setArea(0); setCentroid(null)
    setStep(1); setError('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-card)', border: '1px solid var(--color-card-border)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)', maxHeight: '90vh',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-card-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-paddy-soft)' }}>
              <MapPin size={20} style={{ color: 'var(--color-paddy)' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold m-0" style={{ fontFamily: 'var(--font-display)' }}>
                {editFarm ? 'Edit Field' : t('farm.add_farm')}
              </h2>
              <p className="text-xs m-0" style={{ color: 'var(--color-muted)' }}>
                {step === 1 ? 'Step 1: Draw field boundary' : 'Step 2: Field details'}
              </p>
            </div>
          </div>
          <button onClick={() => { resetForm(); onClose() }}
            className="p-2 rounded-lg" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 ? (
            <div className="p-4 space-y-4">
              <div className="p-3 rounded-xl text-sm"
                style={{ background: 'var(--color-paddy-soft)', color: 'var(--color-paddy)' }}>
                <strong>📍 Draw your field:</strong> Use the polygon tool (▣) on the left side of the map. Click to add points, double-click to complete.
              </div>

              <div className="rounded-xl overflow-hidden" style={{ height: 380, border: '2px solid var(--color-card-border)' }}>
                <MapContainer center={center} zoom={16} style={{ width: '100%', height: '100%' }} scrollWheelZoom={true}>
                  <TileLayer
                    attribution='&copy; OSM'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" opacity={0.3} />
                  <RecenterMap lat={center[0]} lng={center[1]} />
                  <DrawControl onPolygonCreated={handlePolygonCreated} />
                </MapContainer>
              </div>

              {area > 0 && (
                <div className="flex items-center gap-4 p-3 rounded-xl"
                  style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-card-border)' }}>
                  <div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Area</div>
                    <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-paddy)' }}>
                      {area.toFixed(2)} acres <span className="text-sm font-normal" style={{ color: 'var(--color-muted)' }}>({(area * 0.4047).toFixed(2)} ha)</span>
                    </div>
                  </div>
                  {centroid && (
                    <div className="ml-auto text-right">
                      <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Centroid</div>
                      <div className="text-sm font-medium">{centroid.lat.toFixed(4)}°N, {centroid.lng.toFixed(4)}°E</div>
                    </div>
                  )}
                </div>
              )}

              {error && <div className="text-sm p-3 rounded-xl" style={{ background: 'var(--color-alert-soft)', color: 'var(--color-alert)' }}>{error}</div>}
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {area > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-paddy-soft)' }}>
                  <MapPin size={16} style={{ color: 'var(--color-paddy)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-paddy)' }}>
                    {area.toFixed(2)} acres ({(area * 0.4047).toFixed(2)} ha) · {centroid?.lat.toFixed(4)}°N, {centroid?.lng.toFixed(4)}°E
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">Field Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. North Rice Field" className="input w-full" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Crop</label>
                  <select value={crop} onChange={e => setCrop(e.target.value)} className="input w-full" style={{ appearance: 'auto' }}>
                    <option value="">Select crop...</option>
                    {CROP_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Variety</label>
                  <input value={cropVariety} onChange={e => setCropVariety(e.target.value)} placeholder="e.g. ADT-43" className="input w-full" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Soil Type</label>
                  <select value={soilType} onChange={e => setSoilType(e.target.value)} className="input w-full" style={{ appearance: 'auto' }}>
                    <option value="">Select soil...</option>
                    {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Sowing Date</label>
                  <input type="date" value={sowingDate} onChange={e => setSowingDate(e.target.value)} className="input w-full" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Growth Stage</label>
                <div className="flex flex-wrap gap-2">
                  {['Sowing', 'Germination', 'Seedling', 'Vegetative', 'Tillering', 'Flowering', 'Fruiting', 'Harvesting'].map(s => (
                    <button key={s} onClick={() => setGrowthStage(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: growthStage === s ? 'var(--color-paddy)' : 'var(--color-canvas)',
                        color: growthStage === s ? '#fff' : 'var(--color-muted)',
                        border: `1px solid ${growthStage === s ? 'var(--color-paddy)' : 'var(--color-card-border)'}`,
                        cursor: 'pointer',
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="text-sm p-3 rounded-xl" style={{ background: 'var(--color-alert-soft)', color: 'var(--color-alert)' }}>{error}</div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t"
          style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-canvas)' }}>
          {step === 2 ? <button onClick={() => setStep(1)} className="btn btn-outline text-sm py-2 px-4">← Back to Map</button> : <div />}
          <div className="flex gap-2">
            <button onClick={() => { resetForm(); onClose() }} className="btn btn-outline text-sm py-2 px-4">Cancel</button>
            {step === 1 ? (
              <button onClick={proceedToDetails} className="btn btn-primary text-sm py-2 px-4" disabled={!polygon}>
                Next → Details
              </button>
            ) : (
              <button onClick={handleSave} className="btn btn-primary text-sm py-2 px-4" disabled={saving || !name.trim()}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> {editFarm ? 'Update' : 'Create Field'}</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
