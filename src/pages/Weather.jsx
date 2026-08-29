import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend } from 'chart.js'
import { CloudSun, Droplets, Thermometer, Wind, Sun, CloudRain, Sparkles, Loader2, MapPin, AlertTriangle, Eye, Navigation, Layers, ShieldAlert, Waves } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useAIStatus } from '../context/AIStatusContext'
import { fetchFieldWeather, predictFieldRisks } from '../services/weatherService'
import { generateBulletin } from '../services/ollamaService'
import SourceBadge from '../components/SourceBadge'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend)

export default function Weather() {
  const { t, i18n } = useTranslation()
  const { location, farms, setShowLocationModal } = useAppContext()
  const { isAIUnavailable } = useAIStatus()
  const [selectedFarm, setSelectedFarm] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [advisory, setAdvisory] = useState('')
  const [advisoryLoading, setAdvisoryLoading] = useState(false)

  // Default to first farm or location
  useEffect(() => {
    if (farms.length > 0 && !selectedFarm) {
      setSelectedFarm(farms[0])
    }
  }, [farms])

  const targetLat = selectedFarm?.lat || location?.lat || 12.9699
  const targetLng = selectedFarm?.lng || location?.lng || 79.9405
  const locationLabel = selectedFarm ? selectedFarm.name : (location?.display || 'Sriperumbudur, Tamil Nadu')

  useEffect(() => {
    let isMounted = true
    async function loadData() {
      setLoading(true)
      const data = await fetchFieldWeather(targetLat, targetLng)
      if (isMounted) {
        setWeatherData(data)
        setLoading(false)
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [targetLat, targetLng])

  const mlPredictions = useMemo(() => {
    if (!weatherData?.analytics) return null
    return predictFieldRisks(
      {
        soil_moisture_shallow: weatherData.soilData?.[weatherData.soilData.length - 1]?.soil_moisture_1_3cm,
        total_rain_7d: weatherData.analytics.total_rain_7d,
        forecast_rain: weatherData.analytics.forecast_rain_total,
        dry_spell_days: weatherData.analytics.dry_spell,
        current_humidity: weatherData.current?.humidity,
        current_temp: weatherData.current?.temp,
        heat_stress_days: weatherData.analytics.heat_stress_days,
      },
      selectedFarm?.crop || '',
      selectedFarm?.growth_stage || ''
    )
  }, [weatherData, selectedFarm])

  const handleGenerateAdvisory = async () => {
    if (!weatherData?.current) return
    setAdvisoryLoading(true)
    setAdvisory('')
    const weatherSummary = `Location: ${locationLabel}, Temp: ${weatherData.current.temp}°C, Humidity: ${weatherData.current.humidity}%, Condition: ${weatherData.current.weather_desc}, 7-Day Rain: ${weatherData.analytics?.forecast_rain_total || 0}mm`
    try {
      const res = await generateBulletin(weatherSummary, locationLabel, i18n.language)
      setAdvisory(res.bulletin || 'Ollama generated climate advisory.')
    } catch {
      setAdvisory('Unable to reach Ollama AI.')
    } finally {
      setAdvisoryLoading(false)
    }
  }

  // Chart data setup
  const hourlyChartData = useMemo(() => {
    if (!weatherData?.hourly) return null
    const hours = weatherData.hourly.slice(0, 24)
    return {
      labels: hours.map(h => new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
      datasets: [
        {
          label: 'Temperature (°C)',
          data: hours.map(h => h.temp),
          borderColor: '#E2A72E',
          backgroundColor: 'rgba(226, 167, 46, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Precipitation Prob (%)',
          data: hours.map(h => h.precip_probability),
          borderColor: '#3E7CB1',
          backgroundColor: 'rgba(62, 124, 177, 0.2)',
          type: 'bar',
          yAxisID: 'y1',
        },
      ],
    }
  }, [weatherData])

  const historicalChartData = useMemo(() => {
    if (!weatherData?.historical) return null
    const days = weatherData.historical.slice(-30) // last 30 days
    return {
      labels: days.map(d => d.date.split('-').slice(1).join('/')),
      datasets: [
        {
          label: 'Max Temp (°C)',
          data: days.map(d => d.temp_max),
          borderColor: '#E2A72E',
          backgroundColor: 'transparent',
          tension: 0.3,
        },
        {
          label: 'Min Temp (°C)',
          data: days.map(d => d.temp_min),
          borderColor: '#2F7D4F',
          backgroundColor: 'transparent',
          tension: 0.3,
        },
        {
          label: 'Rainfall (mm)',
          data: days.map(d => d.rain),
          borderColor: '#3E7CB1',
          backgroundColor: 'rgba(62, 124, 177, 0.4)',
          type: 'bar',
        },
      ],
    }
  }, [weatherData])

  const soilChartData = useMemo(() => {
    if (!weatherData?.soilData) return null
    const days = weatherData.soilData.slice(-14) // last 14 days
    return {
      labels: days.map(d => d.date.split('-').slice(1).join('/')),
      datasets: [
        {
          label: 'Soil Temp 0cm (°C)',
          data: days.map(d => d.soil_temp_0cm),
          borderColor: '#D97706',
          backgroundColor: 'transparent',
          tension: 0.3,
        },
        {
          label: 'Shallow Moisture (1-3cm)',
          data: days.map(d => (d.soil_moisture_1_3cm * 100).toFixed(1)),
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    }
  }, [weatherData])

  const curr = weatherData?.current

  return (
    <div className="space-y-6">
      {/* Header + Selector Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold m-0" style={{ fontFamily: 'var(--font-display)' }}>
              {t('weather.title')} 🌦️
            </h1>
            <SourceBadge source={weatherData?.is_ai_estimate ? 'ai_estimate' : 'real_api'} />
          </div>
          <p className="text-sm text-muted mt-1" style={{ color: 'var(--color-muted)' }}>
            Weather & Climate Intelligence for <strong>{locationLabel}</strong>
          </p>
        </div>

        {/* Location & Field Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowLocationModal(true)}
            className="btn btn-outline text-xs py-2 px-3 flex items-center gap-1.5"
            style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-card-border)' }}
          >
            <MapPin size={14} style={{ color: 'var(--color-rain)' }} />
            <span>{location?.name ? location.name : 'Select Location'}</span>
          </button>

          {farms.length > 0 && (
            <div className="flex items-center gap-1.5 p-1.5 rounded-xl border"
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
              <Navigation size={14} style={{ color: 'var(--color-paddy)' }} />
              <select
                value={selectedFarm?.id || ''}
                onChange={e => {
                  const f = farms.find(farm => farm.id === parseInt(e.target.value))
                  setSelectedFarm(f || null)
                }}
                className="text-xs font-semibold bg-transparent border-none outline-none cursor-pointer"
                style={{ color: 'var(--color-ink)' }}>
                <option value="">Current Location</option>
                {farms.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: 'var(--color-paddy)' }} />
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Fetching Open-Meteo field microclimate data...</p>
        </div>
      ) : weatherData ? (
        <>
          {/* Main Weather Card */}
          <div className="card p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(47,125,79,0.08) 0%, rgba(62,124,177,0.08) 100%)',
              borderColor: 'var(--color-card-border)'
            }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Temp & Icon */}
              <div className="flex items-center gap-4">
                <div className="text-5xl">{curr?.weather_icon || '☀️'}</div>
                <div>
                  <div className="text-4xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                    {curr?.temp}°C
                  </div>
                  <div className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>
                    {curr?.weather_desc} · Feels like {curr?.feels_like}°C
                  </div>
                  <div className="text-xs mt-1 font-semibold" style={{ color: 'var(--color-paddy)' }}>
                    📍 {locationLabel}
                  </div>
                </div>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2.5 rounded-xl border bg-card/60" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
                  <div className="text-xs flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
                    <Droplets size={14} style={{ color: '#2563EB' }} /> Humidity
                  </div>
                  <div className="text-lg font-bold mt-1" style={{ color: 'var(--color-ink)' }}>{curr?.humidity}%</div>
                </div>
                <div className="p-2.5 rounded-xl border bg-card/60" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
                  <div className="text-xs flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
                    <Wind size={14} style={{ color: '#059669' }} /> Wind Speed
                  </div>
                  <div className="text-lg font-bold mt-1" style={{ color: 'var(--color-ink)' }}>{curr?.wind_speed} km/h</div>
                </div>
                <div className="p-2.5 rounded-xl border bg-card/60" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
                  <div className="text-xs flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
                    <CloudRain size={14} style={{ color: '#3B82F6' }} /> 7D Rain Total
                  </div>
                  <div className="text-lg font-bold mt-1" style={{ color: 'var(--color-ink)' }}>{weatherData.analytics.total_rain_7d.toFixed(1)} mm</div>
                </div>
                <div className="p-2.5 rounded-xl border bg-card/60" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
                  <div className="text-xs flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
                    <Sun size={14} style={{ color: '#D97706' }} /> Dry Spell
                  </div>
                  <div className="text-lg font-bold mt-1" style={{ color: 'var(--color-ink)' }}>{weatherData.analytics.dry_spell} days</div>
                </div>
              </div>

              {/* ML Risk Summary */}
              {mlPredictions && (
                <div className="p-4 rounded-xl border space-y-2"
                  style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-card-border)' }}>
                  <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--color-paddy)' }}>
                    <ShieldAlert size={14} /> ML Field Risk Score
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Irrigation Need:</span>
                    <span className="font-bold uppercase px-2 py-0.5 rounded text-[10px]"
                      style={{
                        background: mlPredictions.irrigation_need === 'high' ? 'var(--color-alert-soft)' : 'var(--color-paddy-soft)',
                        color: mlPredictions.irrigation_need === 'high' ? 'var(--color-alert)' : 'var(--color-paddy)'
                      }}>
                      {mlPredictions.irrigation_need}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Fungal Disease Risk:</span>
                    <span className="font-bold uppercase px-2 py-0.5 rounded text-[10px]"
                      style={{
                        background: mlPredictions.disease_risk === 'high' ? 'var(--color-alert-soft)' : 'var(--color-paddy-soft)',
                        color: mlPredictions.disease_risk === 'high' ? 'var(--color-alert)' : 'var(--color-paddy)'
                      }}>
                      {mlPredictions.disease_risk}
                    </span>
                  </div>
                  <div className="text-[11px] pt-1 border-t italic" style={{ color: 'var(--color-muted)', borderColor: 'var(--color-card-border)' }}>
                    {mlPredictions.reasoning[0] || 'Conditions standard.'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Advisory Generator Card */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} style={{ color: 'var(--color-paddy)' }} />
                <h3 className="text-base font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  {t('weather.farming_advisory')}
                </h3>
              </div>
              <button
                onClick={handleGenerateAdvisory}
                disabled={advisoryLoading || isAIUnavailable}
                className="btn btn-primary text-xs py-2 px-3">
                {advisoryLoading ? <><Loader2 size={13} className="animate-spin" /> Generating...</> : <><Sparkles size={13} /> Generate Bulletin</>}
              </button>
            </div>
            {advisory ? (
              <div className="p-4 rounded-xl text-sm leading-relaxed whitespace-pre-line"
                style={{ background: 'var(--color-paddy-soft)', color: 'var(--color-paddy)' }}>
                {advisory}
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                {t('weather.advisory_desc')}
              </p>
            )}
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-card-border)' }}>
            {[
              { id: 'overview', label: '24h Forecast' },
              { id: 'forecast', label: '7-Day Forecast' },
              { id: 'history', label: '61-Day History' },
              { id: 'soil', label: 'Soil Moisture & Temp' },
            ].map(tItem => (
              <button
                key={tItem.id}
                onClick={() => setTab(tItem.id)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: tab === tItem.id ? 'var(--color-card)' : 'transparent',
                  color: tab === tItem.id ? 'var(--color-paddy)' : 'var(--color-muted)',
                  boxShadow: tab === tItem.id ? 'var(--shadow-card)' : 'none',
                  border: 'none', cursor: 'pointer'
                }}>
                {tItem.label}
              </button>
            ))}
          </div>

          {/* Tab 1: 24h Hourly Forecast */}
          {tab === 'overview' && (
            <div className="card p-5 space-y-4">
              <h4 className="text-sm font-bold">24-Hour Temperature & Rain Probability</h4>
              {hourlyChartData && (
                <div style={{ height: 260 }}>
                  <Line data={hourlyChartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y1: { position: 'right' } } }} />
                </div>
              )}
            </div>
          )}

          {/* Tab 2: 7-Day Forecast Cards */}
          {tab === 'forecast' && (
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
              {weatherData.forecast.map((d, i) => (
                <div key={i} className="card p-3 text-center space-y-2">
                  <div className="text-xs font-bold" style={{ color: 'var(--color-muted)' }}>
                    {new Date(d.date).toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' })}
                  </div>
                  <div className="text-2xl">{d.weather_icon}</div>
                  <div className="text-xs font-bold">{d.temp_max}° / {d.temp_min}°</div>
                  <div className="text-[10px]" style={{ color: '#2563EB' }}>💧 {d.precip_probability}%</div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: 61-Day Historical Chart */}
          {tab === 'history' && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold">Historical Temperature & Rainfall (Last 30 Days)</h4>
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>61 Days Logged</span>
              </div>
              {historicalChartData && (
                <div style={{ height: 280 }}>
                  <Line data={historicalChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Soil Moisture & Depth Temperatures */}
          {tab === 'soil' && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Waves size={16} style={{ color: '#2563EB' }} />
                <h4 className="text-sm font-bold">Soil Moisture & Surface Temperature (0-27cm)</h4>
              </div>
              {soilChartData && (
                <div style={{ height: 260 }}>
                  <Line data={soilChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
