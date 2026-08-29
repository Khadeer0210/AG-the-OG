import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend } from 'chart.js'
import { CloudSun, Droplets, Thermometer, Wind, Sun, CloudRain, Sparkles, Loader2, MapPin, AlertTriangle, Eye, Navigation, Layers, ShieldAlert, Waves, RefreshCw } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useAIStatus } from '../context/AIStatusContext'
import { fetchFieldWeather, fetchWeatherFromOllama, generateFallbackWeatherData, predictFieldRisks } from '../services/weatherService'
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
  const [dataSource, setDataSource] = useState('loading') // 'open_meteo' | 'ollama' | 'fallback'

  // Default to first farm or location
  useEffect(() => {
    if (farms.length > 0 && !selectedFarm) {
      setSelectedFarm(farms[0])
    }
  }, [farms])

  const targetLat = selectedFarm?.lat || location?.lat || 12.9699
  const targetLng = selectedFarm?.lng || location?.lng || 79.9405
  const locationLabel = selectedFarm ? selectedFarm.name : (location?.display || location?.name || 'Sriperumbudur, Tamil Nadu')

  // Load weather: Open-Meteo → Ollama → Static Fallback
  const loadWeather = useCallback(async () => {
    setLoading(true)
    setDataSource('loading')

    // Step 1: Try Open-Meteo API
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLng}` +
        `&daily=sunrise,sunset,daylight_duration,weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,precipitation_probability_max,wind_speed_10m_max` +
        `&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,rain,apparent_temperature,precipitation_probability,precipitation,soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,soil_moisture_1_to_3cm,soil_moisture_9_to_27cm` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m` +
        `&timezone=auto&past_days=61&forecast_days=7`

      const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (res.ok) {
        const data = await fetchFieldWeather(targetLat, targetLng)
        if (data && data.current) {
          setWeatherData(data)
          setDataSource('open_meteo')
          setLoading(false)
          return
        }
      }
    } catch (e) {
      console.warn('[Weather Page] Open-Meteo failed:', e.message)
    }

    // Step 2: Try Ollama AI
    try {
      const ollamaData = await fetchWeatherFromOllama(targetLat, targetLng, locationLabel)
      if (ollamaData && ollamaData.current) {
        setWeatherData(ollamaData)
        setDataSource('ollama')
        setLoading(false)
        return
      }
    } catch (e) {
      console.warn('[Weather Page] Ollama weather failed:', e.message)
    }

    // Step 3: Static fallback — always works
    const fallback = generateFallbackWeatherData(targetLat, targetLng)
    setWeatherData(fallback)
    setDataSource('fallback')
    setLoading(false)
  }, [targetLat, targetLng, locationLabel])

  useEffect(() => {
    loadWeather()
  }, [loadWeather])

  // Auto-generate Ollama advisory when weather loads
  useEffect(() => {
    if (weatherData?.current && !advisory && !isAIUnavailable) {
      handleGenerateAdvisory()
    }
  }, [weatherData])

  const mlPredictions = useMemo(() => {
    if (!weatherData?.analytics) return null
    return predictFieldRisks(
      {
        soil_moisture_shallow: weatherData.soilData?.[weatherData.soilData.length - 1]?.soil_moisture_1_3cm,
        total_rain_7d: weatherData.analytics?.total_rain_7d || 0,
        forecast_rain: weatherData.analytics?.forecast_rain_total || 0,
        dry_spell_days: weatherData.analytics?.dry_spell || 0,
        current_humidity: weatherData.current?.humidity || 0,
        current_temp: weatherData.current?.temp || 0,
        heat_stress_days: weatherData.analytics?.heat_stress_days || 0,
      },
      selectedFarm?.crop || '',
      selectedFarm?.growth_stage || ''
    )
  }, [weatherData, selectedFarm])

  const handleGenerateAdvisory = async () => {
    if (!weatherData?.current) return
    setAdvisoryLoading(true)
    const weatherSummary = `Location: ${locationLabel}, Temp: ${weatherData.current.temp}°C, Humidity: ${weatherData.current.humidity}%, Condition: ${weatherData.current.weather_desc}, Wind: ${weatherData.current.wind_speed} km/h, 7-Day Rain: ${weatherData.analytics?.forecast_rain_total || 0}mm`
    try {
      const res = await generateBulletin(weatherSummary, locationLabel, i18n.language)
      setAdvisory(res.bulletin || weatherData.bulletin || 'Weather advisory generated.')
    } catch {
      setAdvisory(weatherData.bulletin || 'Unable to reach Ollama AI for advisory.')
    } finally {
      setAdvisoryLoading(false)
    }
  }

  // Safe helpers
  const safeNum = (v, d = 0) => (v != null && !isNaN(v)) ? v : d
  const safeFix = (v, digits = 1) => safeNum(v, 0).toFixed ? safeNum(v, 0).toFixed(digits) : '0'

  // Chart data setup
  const hourlyChartData = useMemo(() => {
    if (!weatherData?.hourly?.length) return null
    const hours = weatherData.hourly.slice(0, 24)
    return {
      labels: hours.map(h => {
        try { return new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
      }),
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
          data: hours.map(h => h.precip_probability || 0),
          borderColor: '#3E7CB1',
          backgroundColor: 'rgba(62, 124, 177, 0.2)',
          type: 'bar',
          yAxisID: 'y1',
        },
      ],
    }
  }, [weatherData])

  const historicalChartData = useMemo(() => {
    if (!weatherData?.historical?.length) return null
    const days = weatherData.historical.slice(-30)
    return {
      labels: days.map(d => (d.date || '').split('-').slice(1).join('/')),
      datasets: [
        { label: 'Max Temp (°C)', data: days.map(d => d.temp_max), borderColor: '#E2A72E', backgroundColor: 'transparent', tension: 0.3 },
        { label: 'Min Temp (°C)', data: days.map(d => d.temp_min), borderColor: '#2F7D4F', backgroundColor: 'transparent', tension: 0.3 },
        { label: 'Rainfall (mm)', data: days.map(d => d.rain || 0), borderColor: '#3E7CB1', backgroundColor: 'rgba(62, 124, 177, 0.4)', type: 'bar' },
      ],
    }
  }, [weatherData])

  const soilChartData = useMemo(() => {
    if (!weatherData?.soilData?.length) return null
    const days = weatherData.soilData.slice(-14)
    return {
      labels: days.map(d => (d.date || '').split('-').slice(1).join('/')),
      datasets: [
        { label: 'Soil Temp 0cm (°C)', data: days.map(d => d.soil_temp_0cm), borderColor: '#D97706', backgroundColor: 'transparent', tension: 0.3 },
        { label: 'Shallow Moisture (1-3cm %)', data: days.map(d => ((d.soil_moisture_1_3cm || 0) * 100).toFixed(1)), borderColor: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.1)', fill: true, tension: 0.3 },
      ],
    }
  }, [weatherData])

  const curr = weatherData?.current
  const analytics = weatherData?.analytics || {}

  const sourceLabel = dataSource === 'open_meteo' ? 'real_api' : dataSource === 'ollama' ? 'ai_estimate' : 'calculated'
  const sourceText = dataSource === 'open_meteo' ? 'Open-Meteo Live' : dataSource === 'ollama' ? 'Ollama AI Generated' : 'Local Estimate'

  return (
    <div className="space-y-6">
      {/* Header + Selector Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold m-0" style={{ fontFamily: 'var(--font-display)' }}>
              {t('weather.title')} 🌦️
            </h1>
            <SourceBadge source={sourceLabel} />
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Weather & Climate Intelligence for <strong>{locationLabel}</strong> — <em>{sourceText}</em>
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
            <span>{location?.name || 'Select Location'}</span>
          </button>

          <button
            onClick={loadWeather}
            disabled={loading}
            className="btn btn-outline text-xs py-2 px-3 flex items-center gap-1.5"
            style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-card-border)' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
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
          <p className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Fetching weather intelligence via Ollama AI & Open-Meteo...</p>
          <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>📍 {locationLabel}</p>
        </div>
      ) : weatherData && curr ? (
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
                <div className="text-5xl">{curr.weather_icon || '☀️'}</div>
                <div>
                  <div className="text-4xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                    {safeNum(curr.temp, 28)}°C
                  </div>
                  <div className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>
                    {curr.weather_desc || 'Weather data'} · Feels like {safeNum(curr.feels_like, 30)}°C
                  </div>
                  <div className="text-xs mt-1 font-semibold" style={{ color: 'var(--color-paddy)' }}>
                    📍 {locationLabel}
                  </div>
                </div>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2.5 rounded-xl border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
                  <div className="text-xs flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
                    <Droplets size={14} style={{ color: '#2563EB' }} /> Humidity
                  </div>
                  <div className="text-lg font-bold mt-1" style={{ color: 'var(--color-ink)' }}>{safeNum(curr.humidity, 70)}%</div>
                </div>
                <div className="p-2.5 rounded-xl border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
                  <div className="text-xs flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
                    <Wind size={14} style={{ color: '#059669' }} /> Wind Speed
                  </div>
                  <div className="text-lg font-bold mt-1" style={{ color: 'var(--color-ink)' }}>{safeNum(curr.wind_speed, 10)} km/h</div>
                </div>
                <div className="p-2.5 rounded-xl border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
                  <div className="text-xs flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
                    <CloudRain size={14} style={{ color: '#3B82F6' }} /> 7D Rain Total
                  </div>
                  <div className="text-lg font-bold mt-1" style={{ color: 'var(--color-ink)' }}>{safeFix(analytics.total_rain_7d)} mm</div>
                </div>
                <div className="p-2.5 rounded-xl border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
                  <div className="text-xs flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
                    <Sun size={14} style={{ color: '#D97706' }} /> Dry Spell
                  </div>
                  <div className="text-lg font-bold mt-1" style={{ color: 'var(--color-ink)' }}>{safeNum(analytics.dry_spell, 0)} days</div>
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
                    {mlPredictions.reasoning?.[0] || 'Conditions standard.'}
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
                <h3 className="text-base font-bold m-0" style={{ fontFamily: 'var(--font-display)' }}>
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
            ) : advisoryLoading ? (
              <div className="text-center py-4">
                <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: 'var(--color-paddy)' }} />
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Generating Ollama AI farming bulletin for {locationLabel}...</p>
              </div>
            ) : (
              <p className="text-xs m-0" style={{ color: 'var(--color-muted)' }}>
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
              <h4 className="text-sm font-bold m-0">24-Hour Temperature & Rain Probability</h4>
              {hourlyChartData ? (
                <div style={{ height: 260 }}>
                  <Line data={hourlyChartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { position: 'left' }, y1: { position: 'right', grid: { drawOnChartArea: false } } } }} />
                </div>
              ) : (
                <p className="text-xs text-center py-8" style={{ color: 'var(--color-muted)' }}>No hourly data available for this source</p>
              )}
            </div>
          )}

          {/* Tab 2: 7-Day Forecast Cards */}
          {tab === 'forecast' && (
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
              {(weatherData.forecast || weatherData.daily || []).map((d, i) => (
                <div key={i} className="card p-3 text-center space-y-2">
                  <div className="text-xs font-bold" style={{ color: 'var(--color-muted)' }}>
                    {d.date ? new Date(d.date).toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' }) : `Day ${i + 1}`}
                  </div>
                  <div className="text-2xl">{d.weather_icon || '⛅'}</div>
                  <div className="text-xs font-bold">{safeNum(d.temp_max, 30)}° / {safeNum(d.temp_min, 22)}°</div>
                  <div className="text-[10px]" style={{ color: '#2563EB' }}>💧 {safeNum(d.precip_probability, 10)}%</div>
                  {d.weather_desc && <div className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{d.weather_desc}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: 61-Day Historical Chart */}
          {tab === 'history' && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold m-0">Historical Temperature & Rainfall (Last 30 Days)</h4>
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{weatherData.historical?.length || 0} Days Logged</span>
              </div>
              {historicalChartData ? (
                <div style={{ height: 280 }}>
                  <Line data={historicalChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              ) : (
                <p className="text-xs text-center py-8" style={{ color: 'var(--color-muted)' }}>Historical data not available via Ollama AI — use Open-Meteo for full 61-day history</p>
              )}
            </div>
          )}

          {/* Tab 4: Soil Moisture & Depth Temperatures */}
          {tab === 'soil' && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Waves size={16} style={{ color: '#2563EB' }} />
                <h4 className="text-sm font-bold m-0">Soil Moisture & Surface Temperature (0-27cm)</h4>
              </div>
              {soilChartData ? (
                <div style={{ height: 260 }}>
                  <Line data={soilChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              ) : (
                <p className="text-xs text-center py-8" style={{ color: 'var(--color-muted)' }}>Soil telemetry not available from current data source</p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="card p-8 text-center">
          <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: 'var(--color-turmeric)' }} />
          <p className="text-sm font-medium mb-3">Unable to load weather data</p>
          <button onClick={loadWeather} className="btn btn-primary text-xs py-2 px-4">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}
    </div>
  )
}
