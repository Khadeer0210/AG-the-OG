import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Sprout, Wheat, HeartPulse, AlertTriangle, CloudSun,
  TrendingUp, Camera, PlusCircle, MessageCircle, ArrowRight,
  Droplets, Thermometer, Wind, X, Sparkles, Loader2,
  CalendarDays, Ruler, Eye, MapPin, Cpu, ShieldCheck
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
    farms, crops, alerts: contextAlerts,
    getAIContext
  } = useAppContext()
  const { isAIUnavailable } = useAIStatus()

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
      {/* Vesper.ai Operational AI Infrastructure Hero Component */}
      <div className="vesper-hero-card relative overflow-hidden">
        {/* Background video overlay */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4"
          className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none z-0"
        />

        <div className="relative z-10 p-8 sm:p-12 flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Vesper Badge */}
          <div className="badge-vesper">
            <svg className="badge-star" viewBox="0 0 24 24">
              <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z"/>
            </svg>
            <span>Operational AI Infrastructure · {location?.display || 'Active Region'}</span>
          </div>

          {/* Vesper Headline */}
          <h1 className="text-3xl sm:text-5xl font-medium tracking-tight leading-tight mb-4 text-white">
            Train <em className="font-serif-italic text-gray-400">AI agents</em> on your farm workflows in minutes.
          </h1>

          {/* Vesper Lede */}
          <p className="text-sm sm:text-base text-gray-400 max-w-xl mb-8 font-normal leading-relaxed">
            Deploy adaptive AI agents that learn, execute, and scale operational tasks across your agricultural fields.
          </p>

          {/* Vesper Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/farm" className="btn-vesper-solid no-underline flex items-center gap-2">
              <PlusCircle size={16} /> Add Crop Workflow
            </Link>
            <Link to="/health" className="btn-vesper-ghost no-underline flex items-center gap-2">
              <Camera size={16} /> Scan Plant Health
            </Link>
          </div>
        </div>

        {/* Vesper Stats Footer Bar */}
        <div className="vesper-stats-bar flex-col sm:flex-row">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <defs>
                <linearGradient id="v_g1" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38"/>
                  <stop offset="100%" stopColor="#3a3a3a" stopOpacity="0.62"/>
                </linearGradient>
                <linearGradient id="v_g2" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#3a3a3a" stopOpacity="0.38"/>
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.62"/>
                </linearGradient>
              </defs>
              <rect x="3.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#v_g1)"/>
              <rect x="13.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#v_g2)"/>
              <rect x="9.2" y="10.9" width="5.6" height="2.2" rx="1.1" fill="#4a4a4a"/>
            </svg>
            <span><strong>4.2M+</strong> workflows automated</span>
          </div>

          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="6.2" fill="#ffffff"/>
              <path d="M12 7.1v7.4M8.15 12.35L12 16.2l3.85-3.85" stroke="#111111" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <span><strong>92%</strong> reduction in manual operations</span>
          </div>

          <div className="flex items-center gap-3">
            <svg className="stat-icon-wide" width="38" height="21" viewBox="0 0 40 22">
              <circle cx="10.2" cy="11" r="9.2" fill="#2b2b2b"/>
              <ellipse cx="10.2" cy="12.1" rx="4.15" ry="3.7" fill="#f4f4f4"/>
              <path d="M7.5 7.5L9 9.5M13 7.5L11.5 9.5" stroke="#2b2b2b" strokeWidth="1.2" strokeLinecap="round"/>
              <circle cx="9" cy="11" r="0.7" fill="#1a1a1a"/>
              <circle cx="11.4" cy="11" r="0.7" fill="#1a1a1a"/>

              <circle cx="20.2" cy="11" r="9.2" fill="#ffffff"/>
              <circle cx="18" cy="10" r="1.7" fill="#111111"/>
              <circle cx="22.4" cy="10" r="1.7" fill="#111111"/>
              <ellipse cx="20.2" cy="12.2" rx="1.2" ry="0.8" fill="#111111"/>
              <path d="M18 14c1 1.2 3.4 1.2 4.4 0" stroke="#111111" strokeWidth="1.2" strokeLinecap="round" fill="none"/>

              <circle cx="30.2" cy="11" r="9.2" fill="#f26b1d"/>
              <text x="30.2" y="15.1" fontFamily="'Inter', sans-serif" fontWeight="700" fontSize="12.5" fill="#ffffff" textAnchor="middle">e</text>
            </svg>
            <span><strong>180+</strong> operational teams onboarded</span>
          </div>
        </div>
      </div>

      {/* AI Crop Suggestion Strip */}
      <div className="card p-5 sm:p-6 transition-all duration-300" style={{ borderLeft: '4px solid var(--color-turmeric)', boxShadow: '0 4px 20px rgba(226,167,46,0.08)' }}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-turmeric-soft)' }}>
              <Sparkles size={18} style={{ color: 'var(--color-turmeric-dark)' }} />
            </div>
            <div>
              <h3 className="text-base font-bold m-0" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                {t('dashboard.ai_suggest')}
              </h3>
              <p className="text-xs m-0" style={{ color: 'var(--color-muted)' }}>Local Gemma 3 Microclimate Prescription</p>
            </div>
          </div>
          <button className="btn btn-primary text-xs font-bold py-2 px-4 shadow-md" onClick={suggestCrops} disabled={aiLoading || isAIUnavailable}>
            {aiLoading ? <><Loader2 size={14} className="animate-spin" /> {t('common.loading')}</> : isAIUnavailable ? <><AlertTriangle size={14} /> AI Offline</> : <><Sparkles size={14} /> {t('dashboard.suggest_crops')}</>}
          </button>
        </div>
        {aiError && (
          <div className="alert-banner severity-amber text-xs py-2 px-3 mb-2 rounded-xl">
            <AlertTriangle size={13} className="shrink-0" />
            <span>{t('common.ai_offline')}</span>
          </div>
        )}
        {aiSuggestion ? (
          <div className="text-sm leading-relaxed whitespace-pre-line p-4 rounded-xl mt-2" style={{ background: 'var(--color-canvas)', color: 'var(--color-ink)' }}
            dangerouslySetInnerHTML={{ __html: aiSuggestion.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        ) : (
          !aiError && <p className="text-xs sm:text-sm m-0" style={{ color: 'var(--color-muted)' }}>
            {t('dashboard.suggest_desc')}
          </p>
        )}
      </div>

      {/* Alert Banners */}
      {alerts.slice(0, 3).map(alert => (
        <div key={alert.id} className={`alert-banner ${severityMap[alert.severity] || 'severity-blue'} shadow-sm`}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-sm">{alert.title}</span>
              {alert.action_required ? (
                <span className="chip chip-danger text-[10px] uppercase tracking-wider font-extrabold">{t('dashboard.action_required')}</span>
              ) : null}
            </div>
            <p className="text-xs m-0" style={{ color: 'var(--color-muted)' }}>{alert.body}</p>
          </div>
          <button onClick={() => dismissAlert(alert.id)} className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-black/5"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
            <X size={16} />
          </button>
        </div>
      ))}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Sprout, label: t('dashboard.your_farms'), value: stats.farms, color: 'var(--color-paddy)', bg: 'var(--color-paddy-soft)' },
          { icon: Wheat, label: t('dashboard.total_crops'), value: stats.crops, color: 'var(--color-turmeric-dark)', bg: 'var(--color-turmeric-soft)' },
          { icon: HeartPulse, label: t('dashboard.healthy'), value: stats.healthy, color: 'var(--color-paddy)', bg: 'var(--color-paddy-soft)' },
          { icon: AlertTriangle, label: t('dashboard.alerts'), value: stats.alerts, color: 'var(--color-alert)', bg: 'var(--color-alert-soft)' },
        ].map(({ icon: Icon, label, value, color, bg }, i) => (
          <div key={i} className="card p-4 sm:p-5 flex items-center gap-3.5 transition-all duration-300 hover:-translate-y-1">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: bg }}>
              <Icon size={22} style={{ color }} />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)', color }}>
                <AnimatedCounter target={value} />
              </div>
              <div className="text-xs font-semibold" style={{ color: 'var(--color-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Weather + Market Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weather Mini Card */}
        <div className="card p-5 sm:p-6" style={{ background: 'linear-gradient(135deg, var(--color-rain-soft) 0%, var(--color-card) 100%)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold m-0 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
              <CloudSun size={18} style={{ color: 'var(--color-rain)' }} /> {t('dashboard.weather')}
            </h3>
            <Link to="/weather" className="text-xs font-bold flex items-center gap-1 no-underline transition-transform hover:translate-x-1" style={{ color: 'var(--color-rain)' }}>
              {t('dashboard.view_details')} <ArrowRight size={13} />
            </Link>
          </div>
          {weatherLoading ? (
            <div className="flex items-center gap-2 py-6">
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-rain)' }} />
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('common.loading')}</span>
            </div>
          ) : weather ? (
            <>
              <div className="flex items-center gap-4">
                <span className="text-4xl sm:text-5xl">{weather.icon || '🌡️'}</span>
                <div>
                  <div className="text-3xl sm:text-4xl font-extrabold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>{Math.round(weather.temp)}°C</div>
                  <div className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{weather.condition}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-4 pt-3" style={{ borderTop: '1px solid var(--color-card-border)' }}>
                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                  <Droplets size={14} style={{ color: 'var(--color-rain)' }} /> {weather.humidity}% Humidity
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                  <Wind size={14} style={{ color: 'var(--color-rain)' }} /> {weather.wind_speed} km/h
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                  <Thermometer size={14} style={{ color: 'var(--color-rain)' }} /> Feels {Math.round(weather.feels_like)}°C
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm py-4" style={{ color: 'var(--color-muted)' }}>{t('common.no_data')}</p>
          )}
        </div>

        {/* Market Prices Card */}
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold m-0 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
              <TrendingUp size={18} style={{ color: 'var(--color-turmeric-dark)' }} /> {t('dashboard.market_prices')}
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ background: 'var(--color-turmeric-soft)', color: 'var(--color-turmeric-dark)' }}>
              Agmarknet Live
            </span>
          </div>
          {marketLoading ? (
            <div className="flex items-center gap-2 py-6">
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-turmeric)' }} />
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('common.loading')}</span>
            </div>
          ) : displayMarket.length > 0 ? (
            <div className="space-y-3">
              {displayMarket.map(m => (
                <div key={m.crop} className="flex items-center justify-between text-sm p-2 rounded-xl transition-colors hover:bg-[var(--color-canvas)]">
                  <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>{m.crop}</span>
                  <span className="font-bold text-sm" style={{ color: 'var(--color-paddy)' }}>₹{m.price.toLocaleString('en-IN')} <span className="text-[11px] font-normal text-[var(--color-muted)]">/qtl</span></span>
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-bold m-0" style={{ fontFamily: 'var(--font-display)' }}>
            📍 {t('location.your_location')}
          </h2>
          <Link to="/farm" className="text-xs font-bold flex items-center gap-1 no-underline" style={{ color: 'var(--color-paddy)' }}>
            Open Field Polygon Drawer <ArrowRight size={13} />
          </Link>
        </div>
        <FarmMap height={220} markers={mapMarkers} zoom={12} interactive={false} />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base sm:text-lg font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          {t('dashboard.quick_actions')}
        </h2>
        <div className="grid grid-cols-3 gap-3.5">
          {[
            { icon: Camera, label: t('dashboard.scan_plant'), to: '/health', color: 'var(--color-paddy)', bg: 'var(--color-paddy-soft)' },
            { icon: PlusCircle, label: t('dashboard.add_crop'), to: '/farm', color: 'var(--color-turmeric-dark)', bg: 'var(--color-turmeric-soft)' },
            { icon: MessageCircle, label: t('dashboard.get_advisory'), to: '/chat', color: 'var(--color-rain)', bg: 'var(--color-rain-soft)' },
          ].map(({ icon: Icon, label, to, color, bg }) => (
            <Link key={to} to={to} className="card p-4 sm:p-5 flex flex-col items-center gap-2.5 text-center no-underline transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: bg }}>
                <Icon size={24} style={{ color }} />
              </div>
              <span className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* My Crops Grid */}
      {crops.length > 0 && (
        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            {t('dashboard.my_crops')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {crops.map(crop => {
              const st = statusColors[crop.status] || statusColors.healthy
              const progress = crop.progress || Math.min(95, Math.max(5,
                Math.round(((Date.now() - new Date(crop.plant_date).getTime()) / (1000 * 60 * 60 * 24 * 120)) * 100)
              ))
              return (
                <div key={crop.id} className="card p-4 flex flex-col gap-3 transition-all duration-300 hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold m-0" style={{ fontFamily: 'var(--font-display)' }}>{crop.crop}</h4>
                      <p className="text-xs font-medium m-0" style={{ color: 'var(--color-muted)' }}>{crop.variety}</p>
                    </div>
                    <span className="chip text-[10px] font-bold uppercase tracking-wider" style={{ background: st.bg, color: st.color }}>
                      {t(`common.${st.label}`) || st.label}
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span style={{ color: 'var(--color-muted)' }}>{crop.stage}</span>
                      <span style={{ color: 'var(--color-paddy)' }}>{progress}%</span>
                    </div>
                    <div className="vine-bar">
                      <div className="vine-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                    <div className="flex items-center gap-1.5"><Ruler size={13} /> {crop.area_ha} {t('common.ha')}</div>
                    <div className="flex items-center gap-1.5"><CalendarDays size={13} /> {crop.plant_date}</div>
                  </div>
                  {crop.expected_yield && (
                    <div className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                      {t('dashboard.expected_yield')}: <strong style={{ color: 'var(--color-ink)' }}>{crop.expected_yield}</strong>
                    </div>
                  )}
                  <Link to="/farm" className="btn btn-outline text-xs font-bold py-2 no-underline mt-auto">
                    <Eye size={14} /> {t('dashboard.view_details')}
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
          <Sprout size={44} className="mx-auto mb-3" style={{ color: 'var(--color-paddy)', opacity: 0.4 }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>{t('dashboard.no_crops')}</p>
          <Link to="/farm" className="btn btn-paddy mt-3 text-xs font-bold no-underline py-2.5 px-5">
            <PlusCircle size={16} /> {t('dashboard.add_crop')}
          </Link>
        </div>
      )}
    </div>
  )
}
