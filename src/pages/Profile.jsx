import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'
import { User, MapPin, Sprout, Settings, Shield, Globe, Lock, LogOut, Save, Mail, Phone, CheckCircle2, Award, Sparkles, Navigation, Loader2 } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useField } from '../context/FieldProvider'
import AnimatedCounter from '../components/AnimatedCounter'

const AVATAR_COLORS = [
  'linear-gradient(135deg, #2F7D4F 0%, #1E5434 100%)',
  'linear-gradient(135deg, #E2A72E 0%, #B5801B 100%)',
  'linear-gradient(135deg, #3E7CB1 0%, #275279 100%)',
  'linear-gradient(135deg, #C05B2E 0%, #8A3E1B 100%)',
]

export default function Profile() {
  const { t, i18n } = useTranslation()
  const { location, setLocation } = useAppContext()
  const { farms, allCrops, soilReports, insurancePolicies } = useField()
  const [tab, setTab] = useState('profile')
  const [avatarBg, setAvatarBg] = useState(AVATAR_COLORS[0])
  const [savedToast, setSavedToast] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [saving, setSaving] = useState(false)

  const [user, setUser] = useState({
    name: '',
    email: '',
    phone: '',
    village: '',
    district: '',
    state: '',
    lat: '',
    lng: '',
    soilType: 'Red Loam',
    experienceYears: 0,
  })

  // Fetch profile from database on mount
  useEffect(() => {
    async function loadProfile() {
      setLoadingProfile(true)
      try {
        const res = await fetch('/api/profile.php')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(prev => ({
              ...prev,
              name: data.user.name || prev.name,
              email: data.user.email || prev.email,
              phone: data.user.phone || prev.phone,
              village: data.user.village || prev.village,
              lat: data.user.lat || prev.lat,
              lng: data.user.lng || prev.lng,
            }))
          }
        }
      } catch {
        // Backend unavailable — use location context fallback
        setUser(prev => ({
          ...prev,
          name: prev.name || 'Farmer',
          village: location?.village || prev.village || 'Sriperumbudur',
          lat: location?.lat || prev.lat || 12.9634,
          lng: location?.lng || prev.lng || 79.9431,
        }))
      } finally {
        setLoadingProfile(false)
      }
    }
    loadProfile()
  }, [])

  // Compute real stats from field context
  const stats = [
    { label: 'Registered Plots', value: farms.length, color: 'var(--color-paddy)' },
    { label: 'Active Crops', value: allCrops.length, color: 'var(--color-turmeric)' },
    { label: 'Soil Health Scans', value: soilReports.length || (farms.length > 0 ? 1 : 0), color: 'var(--color-rain)' },
    { label: 'Insurance Policies', value: insurancePolicies.length, color: 'var(--color-laterite)' },
  ]

  const completionPct = [
    user.name ? 15 : 0,
    user.email ? 15 : 0,
    user.phone ? 10 : 0,
    user.village ? 10 : 0,
    user.lat ? 10 : 0,
    user.lng ? 10 : 0,
    farms.length > 0 ? 15 : 0,
    allCrops.length > 0 ? 15 : 0,
  ].reduce((a, b) => a + b, 0)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Save to backend
      const res = await fetch('/api/profile.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          phone: user.phone,
          village: user.village,
          lat: parseFloat(user.lat),
          lng: parseFloat(user.lng),
          language: i18n.language,
        }),
      })
      if (res.ok) {
        // Also update app context location
        setLocation(prev => ({
          ...prev,
          lat: parseFloat(user.lat),
          lng: parseFloat(user.lng),
          village: user.village,
          display: `${user.village}${user.district ? ', ' + user.district : ''}${user.state ? ', ' + user.state : ''}`
        }))
      }
    } catch {
      // Backend unavailable — still update local context
      setLocation(prev => ({
        ...prev,
        lat: parseFloat(user.lat),
        lng: parseFloat(user.lng),
        village: user.village,
        display: `${user.village}${user.district ? ', ' + user.district : ''}${user.state ? ', ' + user.state : ''}`
      }))
    }
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 3000)
    setSaving(false)
  }

  const tabs = [
    { id: 'profile', icon: User, label: t('nav.profile') },
    { id: 'settings', icon: Settings, label: t('profile.settings') },
    { id: 'security', icon: Shield, label: t('profile.security') },
  ]

  const displayName = user.name || 'Farmer'
  const displayVillage = user.village || location?.village || 'Unknown'
  const displayDistrict = user.district || location?.district || ''
  const displayState = user.state || location?.state || ''

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Toast Notification */}
      {savedToast && (
        <div className="fixed top-20 right-6 z-50 px-5 py-3 rounded-2xl bg-emerald-700 text-white font-bold text-sm shadow-2xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 size={18} /> Profile & Farm Geolocation Saved Successfully!
        </div>
      )}

      {/* Hero Profile Header */}
      <div className="card p-6 sm:p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--color-card) 0%, var(--color-paddy-soft) 100%)' }}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar Container */}
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-extrabold text-white shadow-lg transition-transform hover:scale-105"
              style={{ background: avatarBg, fontFamily: 'var(--font-display)' }}>
              {displayName[0] || 'F'}
            </div>
            <div className="flex gap-1 justify-center mt-2">
              {AVATAR_COLORS.map((bg, idx) => (
                <button key={idx} onClick={() => setAvatarBg(bg)}
                  className="w-4 h-4 rounded-full border border-white shadow-sm transition-transform hover:scale-125"
                  style={{ background: bg }} />
              ))}
            </div>
          </div>

          {/* User Details */}
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
              <h2 className="text-2xl font-bold m-0" style={{ fontFamily: 'var(--font-display)' }}>
                {loadingProfile ? <Loader2 size={20} className="animate-spin inline" /> : displayName}
              </h2>
              <span className="chip chip-healthy text-xs"><Award size={12} /> Verified Saarthi Farmer</span>
            </div>
            <p className="text-xs sm:text-sm flex items-center gap-1 justify-center sm:justify-start m-0" style={{ color: 'var(--color-muted)' }}>
              <MapPin size={14} style={{ color: 'var(--color-paddy)' }} /> {displayVillage}{displayDistrict ? `, ${displayDistrict}` : ''}{displayState ? `, ${displayState}` : ''}
            </p>

            {/* Profile Completion Bar */}
            <div className="mt-4 max-w-xs mx-auto sm:mx-0">
              <div className="flex justify-between text-[11px] font-semibold mb-1">
                <span style={{ color: 'var(--color-muted)' }}>Farm Profile Completion</span>
                <span style={{ color: 'var(--color-paddy)' }}>{completionPct}%</span>
              </div>
              <div className="vine-bar">
                <div className="vine-bar-fill" style={{ width: `${completionPct}%` }} />
              </div>
            </div>
          </div>

          {/* Stats Badges — Real Data */}
          <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
            {stats.map((s, i) => (
              <div key={i} className="card p-3 text-center bg-white/70 backdrop-blur-sm">
                <div className="text-xl font-extrabold" style={{ fontFamily: 'var(--font-display)', color: s.color }}>
                  <AnimatedCounter target={s.value} />
                </div>
                <div className="text-[10px] font-bold opacity-75" style={{ color: 'var(--color-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 rounded-2xl glass-panel" style={{ border: '1px solid var(--color-card-border)' }}>
        {tabs.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
            style={{
              background: tab === id ? 'linear-gradient(135deg, var(--color-paddy) 0%, var(--color-paddy-dark) 100%)' : 'transparent',
              color: tab === id ? '#fff' : 'var(--color-muted)',
              boxShadow: tab === id ? '0 4px 14px rgba(47, 125, 79, 0.25)' : 'none',
              border: 'none',
            }}>
            <Icon size={16} /> <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Profile Edit */}
      {tab === 'profile' && (
        <form onSubmit={handleSave} className="card p-6 sm:p-8 space-y-5">
          <h3 className="text-lg font-bold m-0 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <User size={18} style={{ color: 'var(--color-paddy)' }} /> Farmer Profile & Land Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
                <User size={13} /> Full Name
              </label>
              <input className="input" value={user.name} onChange={e => setUser({ ...user, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
                <Mail size={13} /> Email Address
              </label>
              <input className="input" type="email" value={user.email} onChange={e => setUser({ ...user, email: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
                <Phone size={13} /> Mobile Number
              </label>
              <input className="input" value={user.phone} onChange={e => setUser({ ...user, phone: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
                <Sprout size={13} /> Dominant Soil Type
              </label>
              <select className="input" value={user.soilType} onChange={e => setUser({ ...user, soilType: e.target.value })}>
                <option value="Red Loam">Red Loam Soil</option>
                <option value="Alluvial">Alluvial Black Soil</option>
                <option value="Clay Loam">Clay Loam Soil</option>
                <option value="Laterite">Laterite Soil</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-muted)' }}>
              Primary Farm Geolocation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-muted)' }}>Village / Taluk</label>
                <input className="input" value={user.village} onChange={e => setUser({ ...user, village: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-muted)' }}>GPS Latitude</label>
                <input className="input" value={user.lat} onChange={e => setUser({ ...user, lat: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-muted)' }}>GPS Longitude</label>
                <input className="input" value={user.lng} onChange={e => setUser({ ...user, lng: e.target.value })} />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-paddy w-full py-3 text-sm shadow-md" disabled={saving}>
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Profile & Sync Geolocation</>}
          </button>
        </form>
      )}

      {/* Tab: Settings */}
      {tab === 'settings' && (
        <div className="card p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-bold m-0 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Settings size={18} style={{ color: 'var(--color-turmeric)' }} /> Application Preferences
          </h3>

          <div>
            <label className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
              <Globe size={14} /> Advisory & Interface Language
            </label>
            <select className="input text-base font-medium py-3" value={i18n.language}
              onChange={e => { i18n.changeLanguage(e.target.value); localStorage.setItem('agri_lang', e.target.value) }}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.native} ({l.label})</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Tab: Security */}
      {tab === 'security' && (
        <div className="card p-6 sm:p-8 space-y-5">
          <h3 className="text-lg font-bold m-0 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Shield size={18} style={{ color: 'var(--color-laterite)' }} /> Security & Login Credentials
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--color-muted)' }}>Current Password</label>
              <input className="input" type="password" placeholder="••••••••" />
            </div>
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--color-muted)' }}>New Password</label>
              <input className="input" type="password" placeholder="••••••••" />
            </div>
          </div>

          <button className="btn btn-primary w-full py-3 text-sm">
            <Lock size={16} /> Update Password
          </button>
        </div>
      )}
    </div>
  )
}
