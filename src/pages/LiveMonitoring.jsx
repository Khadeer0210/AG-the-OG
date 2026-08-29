import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, Droplets, Thermometer, Wind, Leaf, ShieldAlert, CloudRain, RefreshCw, Loader2, MapPin, AlertTriangle, Waves } from 'lucide-react'
import { useField } from '../context/FieldProvider'
import { fetchFieldWeather, predictFieldRisks, getWeatherFeatures } from '../services/weatherService'
import SourceBadge from '../components/SourceBadge'

const POLL_INTERVAL = 30000 // 30 seconds

export default function LiveMonitoring() {
  const { t } = useTranslation()
  const { farms, selectedFarm, selectFarm, farmCrops } = useField()
  const [data, setData] = useState(null)
  const [predictions, setPredictions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const loadData = useCallback(async () => {
    if (!selectedFarm?.lat) return
    try {
      const weather = await fetchFieldWeather(parseFloat(selectedFarm.lat), parseFloat(selectedFarm.lng))
      setData(weather)
      setLastUpdate(new Date())
      if (weather?.analytics) {
        const features = getWeatherFeatures(weather)
        const preds = predictFieldRisks(features, farmCrops[0]?.crop || '', farmCrops[0]?.stage || '')
        setPredictions(preds)
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [selectedFarm, farmCrops])

  useEffect(() => { loadData() }, [loadData])

  // Periodic polling
  useEffect(() => {
    const timer = setInterval(loadData, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [loadData])

  const curr = data?.current
  const analytics = data?.analytics
  const latestSoil = data?.soilData?.[data.soilData.length - 1]
  const risks = data?.risks || []

  const riskColor = (level) => {
    if (level === 'high') return { bg: 'var(--color-alert-soft)', color: 'var(--color-alert)' }
    if (level === 'moderate') return { bg: 'var(--color-turmeric-soft)', color: 'var(--color-turmeric)' }
    return { bg: 'var(--color-paddy-soft)', color: 'var(--color-paddy)' }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ fontFamily: 'var(--font-display)' }}>Live Monitoring 📡</h1>
          <p className="text-sm m-0" style={{ color: 'var(--color-muted)' }}>Real-time field metrics with 30s auto-refresh</p>
        </div>
        <div className="flex items-center gap-2">
          {farms.length > 0 && (
            <select value={selectedFarm?.id || ''} onChange={e => { const f = farms.find(x => x.id === parseInt(e.target.value)); if (f) selectFarm(f) }}
              className="input text-xs py-1.5 px-3" style={{ appearance: 'auto' }}>
              {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          )}
          <SourceBadge source="real_api" />
          <button onClick={() => { setLoading(true); loadData() }} className="btn btn-outline text-xs py-2 px-3">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {lastUpdate && (
        <div className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-paddy)' }} />
          Last updated: {lastUpdate.toLocaleTimeString()} · Auto-refresh every 30s
        </div>
      )}

      {loading && !data ? (
        <div className="card p-12 text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: 'var(--color-paddy)' }} />
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading field telemetry...</p>
        </div>
      ) : data ? (
        <>
          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Thermometer, label: 'Temperature', value: curr?.temp ? `${curr.temp}°C` : '—', sub: curr ? `Feels ${curr.feels_like}°C` : '', color: '#D97706' },
              { icon: Droplets, label: 'Humidity', value: curr?.humidity ? `${curr.humidity}%` : '—', sub: curr?.weather_desc || '', color: '#2563EB' },
              { icon: Wind, label: 'Wind Speed', value: curr?.wind_speed ? `${curr.wind_speed} km/h` : '—', sub: `Direction: ${curr?.wind_dir || 0}°`, color: '#059669' },
              { icon: CloudRain, label: '7-Day Rain', value: analytics ? `${analytics.total_rain_7d.toFixed(1)} mm` : '—', sub: `Dry spell: ${analytics?.dry_spell || 0}d`, color: '#3B82F6' },
            ].map(({ icon: Icon, label, value, sub, color }, i) => (
              <div key={i} className="card p-5 transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{label}</span>
                </div>
                <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color }}>{value}</div>
                <div className="text-[11px] mt-1" style={{ color: 'var(--color-muted)' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Soil Layer */}
          {latestSoil && (
            <div className="card p-5">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                <Waves size={16} style={{ color: '#8B5CF6' }} /> Soil Conditions
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Surface Temp', value: `${latestSoil.soil_temp_0cm}°C`, color: '#D97706' },
                  { label: 'Shallow Moisture', value: `${(latestSoil.soil_moisture_1_3cm * 100).toFixed(1)}%`, color: '#2563EB' },
                  { label: 'Deep Moisture', value: latestSoil.soil_moisture_9_27cm ? `${(latestSoil.soil_moisture_9_27cm * 100).toFixed(1)}%` : '—', color: '#7C3AED' },
                  { label: '6cm Temp', value: `${latestSoil.soil_temp_6cm}°C`, color: '#EA580C' },
                ].map((m, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--color-canvas)' }}>
                    <div className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--color-muted)' }}>{m.label}</div>
                    <div className="text-lg font-bold" style={{ color: m.color, fontFamily: 'var(--font-display)' }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ML Predictions */}
          {predictions && (
            <div className="card p-5">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                <ShieldAlert size={16} style={{ color: 'var(--color-laterite)' }} /> ML Field Risk Predictions
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Irrigation Need', value: predictions.irrigation_need },
                  { label: 'Disease Risk', value: predictions.disease_risk },
                  { label: 'Heat Stress', value: predictions.heat_stress },
                  { label: 'Crop Stress', value: predictions.crop_stress },
                ].map((p, i) => {
                  const rc = riskColor(p.value)
                  return (
                    <div key={i} className="p-3 rounded-xl text-center" style={{ background: rc.bg }}>
                      <div className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--color-muted)' }}>{p.label}</div>
                      <div className="text-sm font-extrabold uppercase" style={{ color: rc.color }}>{p.value || '—'}</div>
                    </div>
                  )
                })}
              </div>
              {predictions.reasoning?.length > 0 && (
                <div className="mt-3 space-y-1">
                  {predictions.reasoning.map((r, i) => (
                    <div key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--color-muted)' }}>
                      <Activity size={11} className="shrink-0 mt-0.5" style={{ color: 'var(--color-turmeric)' }} /> {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active Risks */}
          {risks.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                <AlertTriangle size={16} style={{ color: 'var(--color-alert)' }} /> Active Field Risks
              </h3>
              <div className="space-y-2">
                {risks.map((r, i) => (
                  <div key={i} className="p-3 rounded-xl flex items-center gap-3" style={{ background: r.severity === 'high' ? 'var(--color-alert-soft)' : 'var(--color-turmeric-soft)', borderLeft: `4px solid ${r.severity === 'high' ? 'var(--color-alert)' : 'var(--color-turmeric)'}` }}>
                    <AlertTriangle size={14} style={{ color: r.severity === 'high' ? 'var(--color-alert)' : 'var(--color-turmeric)' }} />
                    <div>
                      <div className="text-xs font-bold capitalize">{r.type?.replace(/_/g, ' ')}</div>
                      <div className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card p-8 text-center">
          <MapPin size={40} className="mx-auto mb-3" style={{ color: 'var(--color-muted)', opacity: 0.3 }} />
          <h3 className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>No Field Selected</h3>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Select a farm to start live monitoring.</p>
        </div>
      )}
    </div>
  )
}
