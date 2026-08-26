import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sprout, MapPin, Loader2, Mail, Lock, User, Phone } from 'lucide-react'

export default function Auth() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [showLocation, setShowLocation] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', village: '' })
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, ...form }),
      })
      const data = await res.json()
      if (data.success) {
        if (mode === 'register') { setShowLocation(true) }
        else { localStorage.setItem('agri_user', JSON.stringify(data.user)); navigate('/') }
      } else {
        setError(data.error || 'Authentication failed')
      }
    } catch {
      // Demo mode: just navigate
      localStorage.setItem('agri_user', JSON.stringify({ id: 1, name: form.name || 'Karthik', email: form.email }))
      if (mode === 'register') setShowLocation(true)
      else navigate('/')
    } finally { setLoading(false) }
  }

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          localStorage.setItem('agri_lat', pos.coords.latitude)
          localStorage.setItem('agri_lng', pos.coords.longitude)
          navigate('/')
        },
        () => navigate('/')
      )
    } else { navigate('/') }
  }

  if (showLocation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-canvas)' }}>
        <div className="card p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--color-rain-soft)' }}>
            <MapPin size={28} style={{ color: 'var(--color-rain)' }} />
          </div>
          <h2 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)' }}>{t('auth.allow_location')}</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>{t('auth.location_desc')}</p>
          <button className="btn btn-primary w-full mb-3" onClick={requestLocation}>
            <MapPin size={15} /> {t('auth.allow_location')}
          </button>
          <button className="btn btn-ghost w-full text-sm" onClick={() => navigate('/')}>
            {t('auth.skip')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-canvas)' }}>
      <div className="card p-8 max-w-sm w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--color-paddy), var(--color-paddy-soft))' }}>
            <Sprout size={22} color="#fff" />
          </div>
          <div>
            <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>Agri Vision</span>
            <span className="text-[10px] block" style={{ color: 'var(--color-muted)' }}>Krishi Saarthi</span>
          </div>
        </div>

        <h2 className="text-xl text-center mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          {mode === 'login' ? t('auth.welcome') : t('auth.create_account')}
        </h2>
        <p className="text-xs text-center mb-6" style={{ color: 'var(--color-muted)' }}>
          {mode === 'login' ? 'Sign in to access your farm dashboard' : 'Start your smart farming journey'}
        </p>

        {error && (
          <div className="alert-banner severity-red mb-4 text-xs py-2 px-3">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
                <input className="input pl-9" placeholder={t('auth.name')} value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
                <input className="input pl-9" placeholder={t('auth.phone')} value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </>
          )}
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
            <input className="input pl-9" type="email" placeholder={t('auth.email')} value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
            <input className="input pl-9" type="password" placeholder={t('auth.password')} value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button className="btn btn-primary w-full py-3" type="submit" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : mode === 'login' ? t('auth.login') : t('auth.register')}
          </button>
        </form>

        <div className="text-center mt-5">
          <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {mode === 'login' ? t('auth.no_account') : t('auth.have_account')}{' '}
          </span>
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="text-sm font-semibold" style={{ color: 'var(--color-paddy)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {mode === 'login' ? t('auth.register') : t('auth.login')}
          </button>
        </div>
      </div>
    </div>
  )
}
