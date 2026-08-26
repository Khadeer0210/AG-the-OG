import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Sprout, MapPin, FlaskConical, CloudSun, Wallet, PlusCircle, Pencil, Save, Download, Beaker, Leaf, ArrowRight, Loader2, Trash2, Eye, Calendar, Layers } from 'lucide-react'
import FarmMap from '../components/FarmMap'
import AddFarmModal from '../components/AddFarmModal'
import LabReportModal from '../components/LabReportModal'
import { useAppContext } from '../context/AppContext'

const nutrientColor = (val, low, high) => val < low ? 'var(--color-alert)' : val > high ? 'var(--color-paddy)' : 'var(--color-turmeric)'

export default function MyFarm() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { location, farms, crops, fetchFarmsAndCrops } = useAppContext()
  const [activeTab, setActiveTab] = useState('soil')
  const [selectedFarm, setSelectedFarm] = useState(null)
  const [soil, setSoil] = useState(null)
  const [soilLoading, setSoilLoading] = useState(false)
  const [costs, setCosts] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLabModal, setShowLabModal] = useState(false)
  const [editFarm, setEditFarm] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Select first farm when farms load
  useEffect(() => {
    if (farms.length > 0 && !selectedFarm) {
      setSelectedFarm(farms[0])
    }
  }, [farms])

  // Fetch soil data when farm changes
  useEffect(() => {
    if (selectedFarm?.id) {
      fetchSoilData(selectedFarm.id)
      computeCosts(selectedFarm.id)
    }
  }, [selectedFarm?.id])

  const fetchSoilData = async (farmId) => {
    setSoilLoading(true)
    try {
      const res = await fetch(`/api/soil.php?action=report&farm_id=${farmId}`)
      if (res.ok) {
        const data = await res.json()
        setSoil(data)
      }
    } catch { /* Soil data unavailable */ }
    setSoilLoading(false)
  }

  const computeCosts = (farmId) => {
    const farmCrops = crops.filter(c => c.farm_id === farmId)
    const categories = [
      { category: t('farm.seed'), key: 'cost_seed' },
      { category: t('farm.fertilizer'), key: 'cost_fert' },
      { category: t('farm.pesticide'), key: 'cost_pest' },
      { category: t('farm.labor'), key: 'cost_labor' },
      { category: t('farm.irrigation'), key: 'cost_irrigation' },
    ]
    const result = categories.map(cat => ({
      category: cat.category,
      amount: farmCrops.reduce((s, c) => s + (parseFloat(c[cat.key]) || 0), 0),
      per_ha: selectedFarm?.area_ha > 0
        ? Math.round(farmCrops.reduce((s, c) => s + (parseFloat(c[cat.key]) || 0), 0) / selectedFarm.area_ha)
        : 0,
    }))
    setCosts(result)
  }

  const handleFarmSaved = () => {
    fetchFarmsAndCrops?.()
    setEditFarm(null)
  }

  const handleDeleteFarm = async (farmId) => {
    if (!confirm(t('farm.confirm_delete') || 'Are you sure you want to delete this field?')) return
    setDeletingId(farmId)
    try {
      await fetch(`/api/farms.php?id=${farmId}`, { method: 'DELETE' })
      fetchFarmsAndCrops?.()
      if (selectedFarm?.id === farmId) setSelectedFarm(null)
    } catch { /* */ }
    setDeletingId(null)
  }

  const tabs = [
    { id: 'overview', icon: Eye, label: t('farm.overview') || 'Overview' },
    { id: 'soil', icon: FlaskConical, label: t('farm.soil_health') },
    { id: 'weather', icon: CloudSun, label: t('farm.weather_climate') },
    { id: 'budget', icon: Wallet, label: t('farm.crop_log') },
  ]

  const totalCost = costs.reduce((s, c) => s + c.amount, 0)
  const farmCrops = selectedFarm ? crops.filter(c => c.farm_id === selectedFarm.id) : []

  // Build map markers + boundaries
  const mapMarkers = farms.map(f => ({
    lat: f.lat || location?.lat,
    lng: f.lng || location?.lng,
    title: f.name,
    subtitle: `${f.area_ha} ${t('common.ha')} · ${f.soil_type || ''}`,
    icon: '🌾',
    type: 'farm',
  }))

  // Parse GeoJSON boundaries for the map
  const boundaries = farms.filter(f => f.boundary_geojson).map(f => {
    try {
      const geo = typeof f.boundary_geojson === 'string' ? JSON.parse(f.boundary_geojson) : f.boundary_geojson
      return { farmId: f.id, geojson: geo, isSelected: selectedFarm?.id === f.id }
    } catch { return null }
  }).filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl" style={{ fontFamily: 'var(--font-display)' }}>{t('farm.title')} 🌾</h1>
        <button className="btn btn-primary text-sm" onClick={() => { setEditFarm(null); setShowAddModal(true) }}>
          <PlusCircle size={15} /> {t('farm.add_farm')}
        </button>
      </div>

      {/* Farm Selector Cards */}
      {farms.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {farms.map(f => (
            <div key={f.id}
              className="card shrink-0 transition-all"
              style={{
                borderColor: selectedFarm?.id === f.id ? 'var(--color-paddy)' : 'var(--color-card-border)',
                background: selectedFarm?.id === f.id ? 'var(--color-paddy-soft)' : 'var(--color-card)',
                minWidth: 220, border: `1.5px solid ${selectedFarm?.id === f.id ? 'var(--color-paddy)' : 'var(--color-card-border)'}`,
              }}>
              <button onClick={() => setSelectedFarm(f)}
                className="w-full px-4 py-3 flex items-center gap-3 cursor-pointer text-left"
                style={{ background: 'transparent', border: 'none' }}>
                <MapPin size={18} style={{ color: 'var(--color-paddy)' }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{f.name}</div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                    {f.area_ha} {t('common.ha')} · {f.soil_type || 'N/A'}
                  </div>
                </div>
              </button>
              {selectedFarm?.id === f.id && (
                <div className="flex gap-1 px-3 pb-3">
                  <button onClick={() => { setEditFarm(f); setShowAddModal(true) }}
                    className="text-xs px-2 py-1 rounded-md" style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-card-border)', cursor: 'pointer', color: 'var(--color-muted)' }}>
                    <Pencil size={11} /> Edit
                  </button>
                  <button onClick={() => handleDeleteFarm(f.id)}
                    className="text-xs px-2 py-1 rounded-md" style={{ background: 'var(--color-alert-soft)', border: '1px solid transparent', cursor: 'pointer', color: 'var(--color-alert)' }}
                    disabled={deletingId === f.id}>
                    {deletingId === f.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <Sprout size={40} className="mx-auto mb-3" style={{ color: 'var(--color-paddy)', opacity: 0.4 }} />
          <h3 className="text-lg mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            {t('farm.no_farms') || 'No fields yet'}
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
            {t('farm.no_farms_desc') || 'Create your first field by drawing its boundary on the map'}
          </p>
          <button className="btn btn-primary text-sm" onClick={() => setShowAddModal(true)}>
            <PlusCircle size={15} /> {t('farm.add_farm')}
          </button>
        </div>
      )}

      {/* Map */}
      <FarmMap height={350} markers={mapMarkers} zoom={15} boundaries={boundaries} />

      {/* Tabs */}
      {selectedFarm && (
        <>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-card-border)' }}>
            {tabs.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: activeTab === id ? 'var(--color-card)' : 'transparent',
                  color: activeTab === id ? 'var(--color-paddy)' : 'var(--color-muted)',
                  boxShadow: activeTab === id ? 'var(--shadow-card)' : 'none',
                  border: 'none', cursor: 'pointer',
                }}>
                <Icon size={15} /> <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                  <Layers size={16} style={{ color: 'var(--color-paddy)' }} className="inline mr-2" />
                  {t('farm.field_info') || 'Field Information'}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Field ID</div>
                    <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>FIELD-{String(selectedFarm.id).padStart(3, '0')}</div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Area</div>
                    <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>{selectedFarm.area_ha} ha</div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Soil</div>
                    <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>{selectedFarm.soil_type || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Location</div>
                    <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                      {parseFloat(selectedFarm.lat).toFixed(3)}°N
                    </div>
                  </div>
                </div>
              </div>

              {/* Crops on this field */}
              {farmCrops.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                    <Sprout size={16} style={{ color: 'var(--color-paddy)' }} className="inline mr-2" />
                    {t('farm.active_crops') || 'Active Crops'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {farmCrops.map(c => (
                      <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-card-border)' }}>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                          style={{ background: c.status === 'healthy' ? 'var(--color-paddy-soft)' : 'var(--color-alert-soft)' }}>
                          🌱
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold">{c.crop}</div>
                          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                            {c.variety && `${c.variety} · `}{c.stage} · {c.area_ha} ha
                          </div>
                        </div>
                        <div className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            background: c.status === 'healthy' ? 'var(--color-paddy-soft)' : 'var(--color-alert-soft)',
                            color: c.status === 'healthy' ? 'var(--color-paddy)' : 'var(--color-alert)',
                          }}>
                          {c.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Soil Tab */}
          {activeTab === 'soil' && (
            <div className="space-y-4">
              {soilLoading ? (
                <div className="card p-8 text-center">
                  <Loader2 size={24} className="animate-spin mx-auto" style={{ color: 'var(--color-paddy)' }} />
                  <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>{t('common.loading')}</p>
                </div>
              ) : soil?.ph ? (
                <>
                  {/* Soil Score */}
                  <div className="card p-5 flex items-center gap-6">
                    <div className="relative w-20 h-20 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-card-border)" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-paddy)" strokeWidth="3"
                          strokeDasharray={`${soil.score || 50} ${100 - (soil.score || 50)}`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-paddy)' }}>{soil.score || '—'}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>{t('farm.soil_score')}</h3>
                      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{soil.source === 'soilgrids' ? 'ISRIC SoilGrids v2' : t('farm.lab_report')}</p>
                    </div>
                  </div>

                  {/* Nutrients */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { label: t('farm.ph'), value: soil.ph, unit: '', color: nutrientColor(soil.ph, 6.0, 7.5) },
                      { label: t('farm.nitrogen'), value: soil.n, unit: ` ${t('common.kg_ha')}`, color: nutrientColor(soil.n, 200, 300) },
                      { label: t('farm.phosphorus'), value: soil.p, unit: ` ${t('common.kg_ha')}`, color: nutrientColor(soil.p, 25, 50) },
                      { label: t('farm.potassium'), value: soil.k, unit: ` ${t('common.kg_ha')}`, color: nutrientColor(soil.k, 150, 250) },
                      { label: t('farm.organic_carbon'), value: soil.organic_c, unit: '%', color: nutrientColor(soil.organic_c, 0.75, 1.5) },
                    ].map((n, i) => (
                      <div key={i} className="card p-3 text-center">
                        <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{n.label}</div>
                        <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: n.color }}>{n.value}{n.unit}</div>
                      </div>
                    ))}
                  </div>

                  {/* Diagnosis & Prescription */}
                  {(soil.diagnosis_json || soil.prescription_json) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {soil.diagnosis_json && (
                        <div className="card p-4">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
                            <FlaskConical size={15} style={{ color: 'var(--color-rain)' }} /> {t('farm.diagnosis')}
                          </h4>
                          <ul className="space-y-2 text-sm list-none p-0 m-0">
                            {(typeof soil.diagnosis_json === 'string' ? JSON.parse(soil.diagnosis_json) : soil.diagnosis_json).map((d, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--color-paddy)' }} />
                                <span style={{ color: 'var(--color-ink)' }}>{d}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {soil.prescription_json && (
                        <div className="card p-4">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
                            <Leaf size={15} style={{ color: 'var(--color-paddy)' }} /> {t('farm.prescription')}
                          </h4>
                          <ul className="space-y-2 text-sm list-none p-0 m-0">
                            {(typeof soil.prescription_json === 'string' ? JSON.parse(soil.prescription_json) : soil.prescription_json).map((p, i) => (
                              <li key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'var(--color-paddy-soft)' }}>
                                <span className="text-sm">💊</span>
                                <span style={{ color: 'var(--color-ink)' }}>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="card p-8 text-center">
                  <FlaskConical size={40} className="mx-auto mb-3" style={{ color: 'var(--color-rain)', opacity: 0.4 }} />
                  <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('common.no_data')}</p>
                  <div className="flex gap-2 justify-center mt-3">
                    <button className="btn btn-outline text-xs py-1.5 px-3"><Download size={13} /> {t('farm.fetch_soilgrids')}</button>
                    <button className="btn btn-outline text-xs py-1.5 px-3" onClick={() => setShowLabModal(true)}><Beaker size={13} /> {t('farm.add_lab_report')}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Weather Tab */}
          {activeTab === 'weather' && (
            <div className="card p-8 text-center">
              <CloudSun size={48} style={{ color: 'var(--color-rain)', opacity: 0.4 }} className="mx-auto mb-3" />
              <h3 className="text-lg mb-2" style={{ fontFamily: 'var(--font-display)' }}>{t('farm.weather_climate')}</h3>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                View detailed weather for <strong>FIELD-{String(selectedFarm.id).padStart(3, '0')}</strong>
              </p>
              <button className="btn btn-primary mt-4 text-sm" onClick={() => navigate('/weather')}>
                <ArrowRight size={14} /> {t('weather.title')}
              </button>
            </div>
          )}

          {/* Budget Tab */}
          {activeTab === 'budget' && (
            <div className="space-y-4">
              {totalCost > 0 ? (
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'var(--color-canvas)', borderBottom: '1px solid var(--color-card-border)' }}>
                        <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-muted)' }}>{t('farm.category')}</th>
                        <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-muted)' }}>{t('farm.amount')} (₹)</th>
                        <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-muted)' }}>{t('common.per_hectare')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costs.filter(c => c.amount > 0).map((c, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-card-border)' }}>
                          <td className="px-4 py-3 font-medium">{c.category}</td>
                          <td className="px-4 py-3 text-right">₹{c.amount.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-right" style={{ color: 'var(--color-muted)' }}>₹{c.per_ha.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'var(--color-turmeric-soft)' }}>
                        <td className="px-4 py-3 font-bold">{t('common.total')}</td>
                        <td className="px-4 py-3 text-right font-bold" style={{ color: 'var(--color-turmeric)' }}>₹{totalCost.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right font-bold" style={{ color: 'var(--color-turmeric)' }}>
                          ₹{selectedFarm?.area_ha > 0 ? Math.round(totalCost / selectedFarm.area_ha).toLocaleString('en-IN') : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card p-8 text-center">
                  <Wallet size={40} className="mx-auto mb-3" style={{ color: 'var(--color-turmeric)', opacity: 0.4 }} />
                  <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('common.no_data')}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Farm Modal */}
      <AddFarmModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditFarm(null) }}
        onSave={handleFarmSaved}
        editFarm={editFarm}
      />

      {/* Lab Report Modal */}
      <LabReportModal
        isOpen={showLabModal}
        onClose={() => setShowLabModal(false)}
        farm={selectedFarm}
        onSave={() => { setShowLabModal(false); if (selectedFarm?.id) fetchSoilData(selectedFarm.id) }}
      />
    </div>
  )
}
