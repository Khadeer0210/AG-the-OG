import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Sprout, Wheat, HeartPulse, AlertTriangle, CloudSun,
  TrendingUp, Camera, PlusCircle, MessageCircle, ArrowRight,
  Droplets, Thermometer, Wind, X, Sparkles, Loader2,
  CalendarDays, Ruler, Eye, MapPin
} from 'lucide-react'
import AnimatedCounter from '../components/AnimatedCounter'
import FarmMap from '../components/FarmMap'
import { useAppContext } from '../context/AppContext'
import { useAIStatus } from '../context/AIStatusContext'

const statusColors = {
  healthy: { bg: 'var(--color-paddy-soft)', color: 'var(--color-paddy)', label: 'healthy' },
  needs_attention: { bg: 'var(--color-turmeric-soft)', color: '#9a7200', label: 'needs_attention' },
  diseased: { bg: 'var(--color-alert-soft)', color: 'var(--color-alert)', label: 'diseased' },
}

const severityMap = { red: 'severity-red', amber: 'severity-amber', blue: 'severity-blue' }

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const {
    location, weather, weatherLoading, market, marketLoading,
    farms, crops, alerts: contextAlerts, setAlerts: setContextAlerts,
    getAIContext
  } = useAppContext()
  const { isAIReady, isAIUnavailable, isAIInitializing } = useAIStatus()

  const [alerts, setAlerts] = useState([])
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(false)

  // Sync alerts from context
  useEffect(() => {
    if (contextAlerts && contextAlerts.length > 0) {
      setAlerts(contextAlerts)
    }
  }, [contextAlerts])

  // Compute stats from real data
  const stats = {
    farms: farms.length || 0,
    crops: crops.length || 0,
    healthy: crops.filter(c => c.status === 'healthy').length,
    alerts: alerts.length,
  }

  const getTimeOfDay = () => {
    const h = new Date().getHours()
    if (h < 12) return t('dashboard.morning')
    if (h < 17) return t('dashboard.afternoon')
    return t('dashboard.evening')
  }

  const dismissAlert = (id) => setAlerts(alerts.filter(a => a.id !== id))

  // Real Ollama crop suggestion
  const suggestCrops = async () => {
    setAiLoading(true)
    setAiError(false)
    try {
      const ctx = getAIContext()
      const { suggestCrops: ollamaSuggest } = await import('../services/ollamaService')
      const data = await ollamaSuggest(
        ctx.soil || 'alluvial',
        'current',
        location?.display || 'your region',
        i18n.language,
        ctx
      )
      if (data.offline) {
        setAiError(true)
        setAiSuggestion('')
      } else {
        setAiSuggestion(data.suggestions || '')
      }
    } catch {
      setAiError(true)
    } finally {
      setAiLoading(false)
    }
  }

  // Build map markers
  const mapMarkers = [
    ...farms.map(f => ({ lat: f.lat, lng: f.lng, title: f.name, subtitle: `${f.area_ha} ha · ${f.soil_type}`, icon: '🌾', type: 'farm' })),
  ]

  // Format market data for display
  const displayMarket = market.length > 0
    ? market.slice(0, 4).map(m => ({
        crop: m.crop,
        price: parseFloat(m.price),
        unit: '₹/qtl',
      }))
    : []

  const userName = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('agri_user') || '{}')
      return u.name || 'Farmer'
    } catch { return 'Farmer' }
  })()

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl sm:text-3xl mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          {t('dashboard.greeting', { timeOfDay: getTimeOfDay(), name: userName })} 🌱
        </h1>
        <p className="text-sm flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
          <MapPin size={13} />
          {location?.display || t('common.loading')} · {new Date().toLocaleDateString(i18n.language === 'en' ? 'en-IN' : `${i18n.language}-IN`, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* AI Crop Suggestion Strip */}
      <div className="card p-4 sm:p-5" style={{ borderLeft: '4px solid var(--color-turmeric)' }}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: 'var(--color-turmeric)' }} />
            <h3 className="text-base font-semibold m-0" style={{ fontFamily: 'var(--font-display)' }}>
              {t('dashboard.ai_suggest')}
            </h3>
          </div>
          <button className="btn btn-primary text-sm py-2 px-4" onClick={suggestCrops} disabled={aiLoading || isAIUnavailable}>
            {aiLoading ? <><Loader2 size={14} className="animate-spin" /> {t('common.loading')}</> : isAIUnavailable ? <><AlertTriangle size={14} /> AI Offline</> : <><Sparkles size={14} /> {t('dashboard.suggest_crops')}</>}
          </button>
        </div>
        {aiError && (
          <div className="alert-banner severity-amber text-xs py-2 px-3 mb-2">
            <AlertTriangle size={13} className="shrink-0" />
            <span>{t('common.ai_offline')}</span>
          </div>
        )}
        {aiSuggestion ? (
          <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-ink)' }}
            dangerouslySetInnerHTML={{ __html: aiSuggestion.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        ) : (
          !aiError && <p className="text-sm m-0" style={{ color: 'var(--color-muted)' }}>
            {t('dashboard.suggest_desc')}
          </p>
        )}
      </div>

      {/* Alert Banners */}
      {alerts.slice(0, 3).map(alert => (
        <div key={alert.id} className={`alert-banner ${severityMap[alert.severity] || 'severity-blue'}`}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm">{alert.title}</span>
              {alert.action_required ? (
                <span className="chip chip-danger text-[10px]">{t('dashboard.action_required')}</span>
              ) : null}
            </div>
            <p className="text-xs m-0" style={{ color: 'var(--color-muted)' }}>{alert.body}</p>
          </div>
          <button onClick={() => dismissAlert(alert.id)} className="shrink-0 p-1 rounded-md transition-colors"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
            <X size={16} />
          </button>
        </div>
      ))}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Sprout, label: t('dashboard.your_farms'), value: stats.farms, color: 'var(--color-paddy)', bg: 'var(--color-paddy-soft)' },
          { icon: Wheat, label: t('dashboard.total_crops'), value: stats.crops, color: 'var(--color-turmeric)', bg: 'var(--color-turmeric-soft)' },
          { icon: HeartPulse, label: t('dashboard.healthy'), value: stats.healthy, color: 'var(--color-paddy)', bg: 'var(--color-paddy-soft)' },
          { icon: AlertTriangle, label: t('dashboard.alerts'), value: stats.alerts, color: 'var(--color-alert)', bg: 'var(--color-alert-soft)' },
        ].map(({ icon: Icon, label, value, color, bg }, i) => (
          <div key={i} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color }}>
                <AnimatedCounter target={value} />
              </div>
              <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Weather + Market Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weather Mini Card */}
        <div className="card p-5" style={{ background: 'linear-gradient(135deg, var(--color-rain-soft), var(--color-card))' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold m-0 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              <CloudSun size={16} style={{ color: 'var(--color-rain)' }} /> {t('dashboard.weather')}
            </h3>
            <Link to="/weather" className="text-xs font-medium flex items-center gap-1 no-underline" style={{ color: 'var(--color-rain)' }}>
              {t('dashboard.view_details')} <ArrowRight size={12} />
            </Link>
          </div>
          {weatherLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-rain)' }} />
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('common.loading')}</span>
            </div>
          ) : weather ? (
            <>
              <div className="flex items-center gap-4">
                <span className="text-4xl">{weather.icon || '🌡️'}</span>
                <div>
                  <div className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{Math.round(weather.temp)}°C</div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{weather.condition}</div>
                </div>
              </div>
              <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--color-card-border)' }}>
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                  <Droplets size={13} /> {weather.humidity}%
                </span>
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                  <Wind size={13} /> {weather.wind_speed} km/h
                </span>
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                  <Thermometer size={13} /> {t('weather.feels_like')} {Math.round(weather.feels_like)}°C
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm py-4" style={{ color: 'var(--color-muted)' }}>{t('common.no_data')}</p>
          )}
        </div>

        {/* Market Prices Card */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold m-0 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              <TrendingUp size={16} style={{ color: 'var(--color-turmeric)' }} /> {t('dashboard.market_prices')}
            </h3>
          </div>
          {marketLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-turmeric)' }} />
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('common.loading')}</span>
            </div>
          ) : displayMarket.length > 0 ? (
            <div className="space-y-2.5">
              {displayMarket.map(m => (
                <div key={m.crop} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--color-ink)' }}>{m.crop}</span>
                  <span className="font-semibold">₹{m.price.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm py-4" style={{ color: 'var(--color-muted)' }}>{t('common.no_data')}</p>
          )}
        </div>
      </div>

      {/* Mini Map */}
      <div>
        <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          📍 {t('location.your_location')}
        </h2>
        <FarmMap height={200} markers={mapMarkers} zoom={12} interactive={false} />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          {t('dashboard.quick_actions')}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Camera, label: t('dashboard.scan_plant'), to: '/health', color: 'var(--color-paddy)', bg: 'var(--color-paddy-soft)' },
            { icon: PlusCircle, label: t('dashboard.add_crop'), to: '/farm', color: 'var(--color-turmeric)', bg: 'var(--color-turmeric-soft)' },
            { icon: MessageCircle, label: t('dashboard.get_advisory'), to: '/chat', color: 'var(--color-rain)', bg: 'var(--color-rain-soft)' },
          ].map(({ icon: Icon, label, to, color, bg }) => (
            <Link key={to} to={to} className="card p-4 flex flex-col items-center gap-2 text-center no-underline transition-all hover:shadow-lg">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={22} style={{ color }} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--color-ink)' }}>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* My Crops Grid */}
      {crops.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            {t('dashboard.my_crops')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {crops.map(crop => {
              const st = statusColors[crop.status] || statusColors.healthy
              const progress = crop.progress || Math.min(95, Math.max(5,
                Math.round(((Date.now() - new Date(crop.plant_date).getTime()) / (1000 * 60 * 60 * 24 * 120)) * 100)
              ))
              return (
                <div key={crop.id} className="card p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-semibold m-0" style={{ fontFamily: 'var(--font-display)' }}>{crop.crop}</h4>
                      <p className="text-xs m-0" style={{ color: 'var(--color-muted)' }}>{crop.variety}</p>
                    </div>
                    <span className="chip text-[10px]" style={{ background: st.bg, color: st.color }}>
                      {t(`common.${st.label}`) || st.label}
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--color-muted)' }}>{crop.stage}</span>
                      <span className="font-medium" style={{ color: 'var(--color-paddy)' }}>{progress}%</span>
                    </div>
                    <div className="vine-bar">
                      <div className="vine-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--color-muted)' }}>
                    <div className="flex items-center gap-1"><Ruler size={12} /> {crop.area_ha} {t('common.ha')}</div>
                    <div className="flex items-center gap-1"><CalendarDays size={12} /> {crop.plant_date}</div>
                  </div>
                  {crop.expected_yield && (
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      {t('dashboard.expected_yield')}: <strong style={{ color: 'var(--color-ink)' }}>{crop.expected_yield}</strong>
                    </div>
                  )}
                  <Link to="/farm" className="btn btn-outline text-xs py-1.5 no-underline mt-auto">
                    <Eye size={13} /> {t('dashboard.view_details')}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state for crops */}
      {crops.length === 0 && !marketLoading && (
        <div className="card p-8 text-center">
          <Sprout size={40} className="mx-auto mb-3" style={{ color: 'var(--color-paddy)', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('dashboard.no_crops')}</p>
          <Link to="/farm" className="btn btn-primary mt-3 text-sm no-underline">
            <PlusCircle size={15} /> {t('dashboard.add_crop')}
          </Link>
        </div>
      )}
    </div>
  )
}
