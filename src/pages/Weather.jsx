import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend } from 'chart.js'
import { CloudSun, Droplets, Thermometer, Wind, Sun, CloudRain, Sparkles, Loader2, MapPin, AlertTriangle, Eye, Navigation } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useAIStatus } from '../context/AIStatusContext'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend)

export default function Weather() {
  const { t, i18n } = useTranslation()
  const { location, weather, weatherLoading, getAIContext } = useAppContext()
  const { isAIUnavailable } = useAIStatus()
  const [tab, setTab] = useState('hourly')
  const [hourly, setHourly] = useState(null)
  const [daily, setDaily] = useState(null)
  const [climate, setClimate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [advisory, setAdvisory] = useState('')
  const [advisoryLoading, setAdvisoryLoading] = useState(false)

  // Fetch hourly by default on mount when location is ready
  useEffect(() => {
    if (!location?.lat) return
    if (tab === 'hourly' && !hourly) fetchHourly()
    if (tab === 'daily' && !daily) fetchDaily()
    if (tab === 'climate' && !climate) fetchClimate()
  }, [tab, location?.lat])

  const fetchHourly = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/weather.php?action=hourly&lat=${location.lat}&lng=${location.lng}`)
      if (res.ok) {
        const data = await res.json()
        setHourly(data.hourly || [])
      } else {
        await fetchHourlyDirect()
      }
    } catch {
      await fetchHourlyDirect()
    } finally {
      setLoading(false)
    }
  }

  const fetchHourlyDirect = async () => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation&forecast_hours=24&timezone=auto`
      const res = await fetch(url)
      const data = await res.json()
      const h = data.hourly || {}
      const result = (h.time || []).map((t, i) => ({
        time: t,
        temp: h.temperature_2m?.[i] ?? 0,
        humidity: h.relative_humidity_2m?.[i] ?? 0,
        rain_prob: h.precipitation_probability?.[i] ?? 0,
        precipitation: h.precipitation?.[i] ?? 0,
      }))
      setHourly(result)
    } catch {
      setHourly([])
    }
  }

  const fetchDaily = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/weather.php?action=daily&lat=${location.lat}&lng=${location.lng}`)
      if (res.ok) {
        const data = await res.json()
        setDaily(data.daily || [])
      } else {
        await fetchDailyDirect()
      }
    } catch {
      await fetchDailyDirect()
    } finally {
      setLoading(false)
    }
  }

  const fetchDailyDirect = async () => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&forecast_days=7&timezone=auto`
      const res = await fetch(url)
      const data = await res.json()
      const d = data.daily || {}
      const codeToIcon = (c) => c <= 1 ? '☀️' : c <= 3 ? '⛅' : c <= 55 ? '🌦️' : c <= 65 ? '🌧️' : c <= 82 ? '🌧️' : '⛈️'
      const result = (d.time || []).map((t, i) => ({
        date: t,
        temp_max: d.temperature_2m_max?.[i] ?? 0,
        temp_min: d.temperature_2m_min?.[i] ?? 0,
        precipitation: d.precipitation_sum?.[i] ?? 0,
        rain_prob: d.precipitation_probability_max?.[i] ?? 0,
        icon: codeToIcon(d.weather_code?.[i] ?? 0),
      }))
      setDaily(result)
    } catch {
      setDaily([])
    }
  }

  const fetchClimate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/weather.php?action=climate&lat=${location.lat}&lng=${location.lng}`)
      if (res.ok) {
        const data = await res.json()
        setClimate(data)
      }
    } catch { /* Climate fallback */ }
    setLoading(false)
  }

  const fetchAdvisory = async () => {
    setAdvisoryLoading(true)
    try {
      const ctx = getAIContext()
      const { generateBulletin } = await import('../services/ollamaService')
      const data = await generateBulletin(
        ctx.weather || '',
        location?.display || 'your area',
        i18n.language,
        ctx
      )
      setAdvisory(data.bulletin || '')
    } catch {
      setAdvisory('')
    } finally {
      setAdvisoryLoading(false)
    }
  }

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#7A6F60' } },
      y: { grid: { color: '#EAE1D240' }, ticks: { font: { size: 11 }, color: '#7A6F60' } },
    },
  }

  const hourlyChartData = hourly ? {
    labels: hourly.map(h => {
      const d = new Date(h.time)
      return d.getHours() + ':00'
    }),
    datasets: [
      {
        label: t('weather.temp'),
        data: hourly.map(h => h.temp),
        borderColor: '#E2A72E',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx
          const gradient = ctx.createLinearGradient(0, 0, 0, 200)
          gradient.addColorStop(0, 'rgba(226, 167, 46, 0.35)')
          gradient.addColorStop(1, 'rgba(226, 167, 46, 0.0)')
          return gradient
        },
        fill: true,
        tension: 0.45,
        pointRadius: 4,
        pointBackgroundColor: '#E2A72E',
      },
    ],
  } : null

  const rainChartData = hourly ? {
    labels: hourly.map(h => {
      const d = new Date(h.time)
      return d.getHours() + ':00'
    }),
    datasets: [
      {
        label: t('weather.rain') + ' %',
        data: hourly.map(h => h.rain_prob),
        backgroundColor: 'rgba(62, 124, 177, 0.7)',
        borderColor: '#3E7CB1',
        borderWidth: 1.5,
        borderRadius: 8,
      },
    ],
  } : null

  const getDayName = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(i18n.language === 'en' ? 'en-IN' : `${i18n.language}-IN`, { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Title Banner */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl m-0" style={{ fontFamily: 'var(--font-display)' }}>
            {t('weather.title')} 🌤️
          </h1>
          <p className="text-xs sm:text-sm flex items-center gap-1.5 mt-1" style={{ color: 'var(--color-muted)' }}>
            <MapPin size={14} style={{ color: 'var(--color-paddy)' }} /> {location?.display || t('common.loading')}
          </p>
        </div>
      </div>

      {/* Hero Weather Card */}
      <div className="card p-6 sm:p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1E5434 0%, #2F7D4F 50%, #3E7CB1 100%)', color: '#fff' }}>
        {weatherLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={32} className="animate-spin text-white opacity-80" />
          </div>
        ) : weather ? (
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-md flex items-center justify-center text-5xl shadow-inner border border-white/20 animate-float">
                {weather.icon || '🌡️'}
              </div>
              <div>
                <div className="text-5xl sm:text-6xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                  {Math.round(weather.temp)}°C
                </div>
                <div className="text-sm font-medium opacity-90 flex items-center gap-2 mt-1">
                  <span>{weather.condition}</span>
                  <span className="opacity-40">•</span>
                  <span>{t('weather.feels_like')} {Math.round(weather.feels_like)}°C</span>
                </div>
              </div>
            </div>

            {/* Weather Metrics Pill Grid */}
            <div className="w-full md:w-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Droplets, label: t('weather.humidity'), val: `${weather.humidity}%` },
                { icon: Wind, label: t('weather.wind'), val: `${weather.wind_speed} km/h` },
                { icon: CloudRain, label: t('weather.rain'), val: `${weather.precipitation || 0} mm` },
                { icon: Navigation, label: 'Wind Dir', val: `${weather.wind_direction || 180}°` },
              ].map(({ icon: Icon, label, val }, i) => (
                <div key={i} className="px-4 py-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-center min-w-[100px]">
                  <Icon size={18} className="mx-auto mb-1 opacity-90" />
                  <div className="text-[11px] opacity-75 font-medium">{label}</div>
                  <div className="text-sm font-extrabold mt-0.5">{val}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-center py-6 opacity-80">{t('common.no_data')}</p>
        )}
      </div>

      {/* Weather Forecast & Pattern Tabs */}
      <div className="flex gap-2 p-1.5 rounded-2xl glass-panel" style={{ border: '1px solid var(--color-card-border)' }}>
        {[
          { id: 'hourly', label: '24-Hour Curve', icon: CloudSun },
          { id: 'daily', label: '7-Day Monsoon Forecast', icon: CloudRain },
          { id: 'climate', label: 'Climate Anomalies & AI', icon: Sparkles },
        ].map(tb => {
          const Icon = tb.icon
          const isActive = tab === tb.id
          return (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className="flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              style={{
                background: isActive ? 'linear-gradient(135deg, var(--color-paddy) 0%, var(--color-paddy-dark) 100%)' : 'transparent',
                color: isActive ? '#fff' : 'var(--color-muted)',
                boxShadow: isActive ? '0 4px 14px rgba(47, 125, 79, 0.25)' : 'none',
                border: 'none',
              }}>
              <Icon size={16} /> {tb.label}
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="card p-12 text-center">
          <Loader2 size={28} className="animate-spin mx-auto" style={{ color: 'var(--color-rain)' }} />
          <p className="text-sm mt-3" style={{ color: 'var(--color-muted)' }}>Fetching live meteorological patterns...</p>
        </div>
      )}

      {/* Hourly Curves */}
      {tab === 'hourly' && !loading && hourly && hourlyChartData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Thermometer size={16} style={{ color: 'var(--color-turmeric)' }} /> 24-Hour Temperature Curve (°C)
            </h3>
            <div style={{ height: 240 }}><Line data={hourlyChartData} options={chartOpts} /></div>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <CloudRain size={16} style={{ color: 'var(--color-rain)' }} /> 24-Hour Rain Probability (%)
            </h3>
            <div style={{ height: 240 }}><Bar data={rainChartData} options={chartOpts} /></div>
          </div>
        </div>
      )}

      {/* 7-Day Monsoon Forecast */}
      {tab === 'daily' && !loading && daily && daily.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center bg-white/50" style={{ borderColor: 'var(--color-card-border)' }}>
            <h3 className="text-sm font-bold m-0" style={{ fontFamily: 'var(--font-display)' }}>7-Day Micro-Climate Trend</h3>
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CloudRain size={13} /> Open-Meteo High Resolution Model
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-card-border)' }}>
            {daily.map((d, i) => (
              <div key={i} className="flex items-center px-6 py-4 gap-4 transition-colors hover:bg-black/[0.02]">
                <div className="w-28 text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{getDayName(d.date)}</div>
                <div className="text-2xl w-10 text-center">{d.icon}</div>
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-sm font-extrabold text-amber-600 w-10">{Math.round(d.temp_max)}°C</span>
                  <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-amber-100/60">
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(100, Math.max(15, ((d.temp_max - 10) / 30) * 100))}%`,
                      background: `linear-gradient(90deg, #3E7CB1 0%, #E2A72E 100%)`,
                    }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 w-10">{Math.round(d.temp_min)}°C</span>
                </div>
                <div className="flex items-center gap-1.5 w-20 justify-end">
                  <Droplets size={14} style={{ color: 'var(--color-rain)' }} />
                  <span className="text-xs font-extrabold" style={{ color: d.rain_prob > 40 ? 'var(--color-rain)' : 'var(--color-muted)' }}>{d.rain_prob}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Climate Anomalies & AI Bulletin */}
      {tab === 'climate' && !loading && (
        <div className="space-y-6">
          {climate && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: t('weather.rain_anomaly'), value: `${climate.rain_anomaly_pct > 0 ? '+' : ''}${climate.rain_anomaly_pct}%`, color: 'var(--color-rain)' },
                { label: 'SPI Drought Index', value: climate.spi_30day, color: 'var(--color-turmeric)' },
                { label: t('weather.heatwave'), value: `${climate.heatwave_days} days`, color: 'var(--color-laterite)' },
                { label: t('weather.dry_spell'), value: `${climate.max_dry_spell_days} days`, color: 'var(--color-alert)' },
                { label: t('weather.monsoon'), value: climate.monsoon_onset_estimate, color: 'var(--color-paddy)' },
              ].map((c, i) => (
                <div key={i} className="card p-4 text-center">
                  <div className="text-[11px] mb-1 font-medium" style={{ color: 'var(--color-muted)' }}>{c.label}</div>
                  <div className="text-lg sm:text-xl font-extrabold" style={{ fontFamily: 'var(--font-display)', color: c.color }}>{c.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* AI Agronomy Advisory */}
          <div className="card p-6" style={{ borderLeft: '5px solid var(--color-paddy)' }}>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold m-0 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <Sparkles size={18} style={{ color: 'var(--color-turmeric)' }} /> Krishi Saarthi Live Weather Advisory
                </h3>
                <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  Real-time micro-climate advisory generated by Ollama AI based on local rain & temperature trends.
                </p>
              </div>
              <button className="btn btn-paddy text-xs py-2 px-4 shadow-sm" onClick={fetchAdvisory} disabled={advisoryLoading || isAIUnavailable}>
                {advisoryLoading ? <Loader2 size={14} className="animate-spin" /> : isAIUnavailable ? <AlertTriangle size={14} /> : <Sparkles size={14} />}
                {advisoryLoading ? 'Generating Advisory...' : isAIUnavailable ? 'AI Offline' : 'Generate Live AI Advisory'}
              </button>
            </div>

            {advisory ? (
              <div className="p-4 rounded-xl text-sm leading-relaxed whitespace-pre-line bg-emerald-50/50 border border-emerald-100"
                dangerouslySetInnerHTML={{ __html: advisory.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            ) : (
              <div className="p-4 rounded-xl text-xs bg-gray-50 text-slate-600 border border-gray-100">
                Click <strong>Generate Live AI Advisory</strong> to get hyper-localized irrigation and crop protection advice tailored to this week's weather pattern.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
