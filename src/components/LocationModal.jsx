import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppContext } from '../context/AppContext'
import { MapPin, Loader2, Search, Navigation, X, AlertCircle } from 'lucide-react'

export default function LocationModal() {
  const { t } = useTranslation()
  const { showLocationModal, setShowLocationModal, requestGeolocation, updateLocation, locationLoading, locationError, location } = useAppContext()
  const [manualMode, setManualMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  if (!showLocationModal || location) return null

  const searchLocation = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=5`
      )
      const data = await res.json()
      setSearchResults(data.map(r => ({
        name: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      })))
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{
      background: 'rgba(43, 38, 32, 0.6)', backdropFilter: 'blur(8px)',
    }}>
      <div className="card p-6 sm:p-8 max-w-md w-full" style={{ animation: 'fade-up 0.4s var(--ease-monsoon) forwards' }}>
        {!manualMode ? (
          <>
            {/* Auto-detect mode */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--color-rain-soft), var(--color-paddy-soft))' }}>
                <Navigation size={36} style={{ color: 'var(--color-rain)' }} />
              </div>
              <h2 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                {t('location.title')}
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
                {t('location.desc')}
              </p>

              {locationError && (
                <div className="alert-banner severity-amber mb-4 text-xs py-2.5 px-3.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{locationError}</span>
                </div>
              )}

              <button
                className="btn btn-primary w-full py-3 mb-3"
                onClick={requestGeolocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> {t('location.detecting')}</>
                ) : (
                  <><MapPin size={16} /> {t('location.allow')}</>
                )}
              </button>

              <button
                className="btn btn-outline w-full"
                onClick={() => setManualMode(true)}
              >
                <Search size={15} /> {t('location.manual')}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Manual search mode */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg m-0" style={{ fontFamily: 'var(--font-display)' }}>
                {t('location.search_title')}
              </h3>
              <button onClick={() => setManualMode(false)} className="p-1.5 rounded-lg"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                className="input flex-1"
                placeholder={t('location.search_placeholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchLocation()}
              />
              <button className="btn btn-primary px-4" onClick={searchLocation} disabled={searching}>
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => updateLocation(r.lat, r.lng)}
                    className="w-full text-left p-3 rounded-xl flex items-start gap-3 transition-all"
                    style={{
                      background: 'var(--color-canvas)',
                      border: '1px solid var(--color-card-border)',
                      cursor: 'pointer',
                    }}
                  >
                    <MapPin size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--color-rain)' }} />
                    <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{r.name}</span>
                  </button>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searching && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--color-muted)' }}>
                {t('location.no_results')}
              </p>
            )}
          </>
        )}

        <p className="text-[10px] text-center mt-5 m-0" style={{ color: 'var(--color-muted)' }}>
          {t('location.privacy')}
        </p>
      </div>
    </div>
  )
}
