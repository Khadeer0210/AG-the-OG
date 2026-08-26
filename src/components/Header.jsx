import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'
import {
  LayoutDashboard, Sprout, Leaf, CloudSun, MessageCircle,
  Shield, BookOpen, Heart, Bell, User, Menu, X, Globe, LogOut,
  ChevronDown, ChevronRight, Settings, FileText, HelpCircle
} from 'lucide-react'
import AIStatusIndicator from './AIStatusIndicator'

// Primary nav — always visible in header
const PRIMARY_NAV = [
  { path: '/', icon: LayoutDashboard, key: 'nav.dashboard' },
  { path: '/farm', icon: Sprout, key: 'nav.my_farm' },
  { path: '/health', icon: Leaf, key: 'nav.plant_health' },
  { path: '/weather', icon: CloudSun, key: 'nav.weather' },
  { path: '/insurance', icon: Shield, key: 'nav.insurance' },
]

// Secondary nav — lives in sidebar drawer
const SECONDARY_NAV = [
  { path: '/chat', icon: MessageCircle, key: 'nav.advisory' },
  { path: '/library', icon: BookOpen, key: 'nav.library' },
  { path: '/impact', icon: Heart, key: 'nav.impact' },
  { path: '/notifications', icon: Bell, key: 'nav.notifications' },
  { path: '/profile', icon: User, key: 'nav.profile' },
]

export default function Header() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef(null)
  const unreadCount = 3

  // Close language dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
    setMobileOpen(false)
  }, [location.pathname])

  const changeLanguage = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('agri_lang', code)
    setLangOpen(false)
  }

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]

  return (
    <>
      <header className="sticky top-0 z-50 border-b" style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-card-border)',
        boxShadow: '0 1px 3px rgba(60,45,20,0.04)',
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Left: Drawer Toggle + Logo */}
            <div className="flex items-center gap-2">
              {/* Sidebar Toggle */}
              <button
                onClick={() => setDrawerOpen(!drawerOpen)}
                className="p-2 rounded-lg transition-colors"
                style={{
                  background: drawerOpen ? 'var(--color-paddy-soft)' : 'transparent',
                  color: drawerOpen ? 'var(--color-paddy)' : 'var(--color-muted)',
                  border: 'none', cursor: 'pointer',
                }}
                aria-label="Toggle navigation drawer"
              >
                {drawerOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              {/* Logo */}
              <Link to="/" className="flex items-center gap-2.5 no-underline">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, var(--color-paddy), var(--color-paddy-soft))',
                }}>
                  <Sprout size={20} color="#fff" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold leading-tight" style={{
                    fontFamily: 'var(--font-display)', color: 'var(--color-ink)',
                  }}>
                    {t('app_name')}
                  </span>
                  <span className="text-[10px] leading-tight" style={{ color: 'var(--color-muted)' }}>
                    Krishi Saarthi
                  </span>
                </div>
              </Link>
            </div>

            {/* Center: Primary Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {PRIMARY_NAV.map(({ path, icon: Icon, key }) => {
                const active = location.pathname === path
                return (
                  <Link key={path} to={path}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium no-underline transition-all duration-200"
                    style={{
                      color: active ? 'var(--color-paddy)' : 'var(--color-muted)',
                      background: active ? 'var(--color-paddy-soft)' : 'transparent',
                    }}>
                    <Icon size={16} />
                    <span>{t(key)}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <AIStatusIndicator compact />

              {/* Language Selector */}
              <div className="relative" ref={langRef}>
                <button onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: langOpen ? 'var(--color-paddy-soft)' : 'transparent',
                    color: 'var(--color-muted)', border: 'none', cursor: 'pointer',
                  }}>
                  <Globe size={15} />
                  <span className="hidden sm:inline">{currentLang.native}</span>
                  <ChevronDown size={13} />
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-1 py-1 rounded-xl min-w-[160px] z-50" style={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-card-border)',
                    boxShadow: 'var(--shadow-card-hover)',
                  }}>
                    {LANGUAGES.map(lang => (
                      <button key={lang.code} onClick={() => changeLanguage(lang.code)}
                        className="w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors"
                        style={{
                          background: i18n.language === lang.code ? 'var(--color-paddy-soft)' : 'transparent',
                          color: i18n.language === lang.code ? 'var(--color-paddy)' : 'var(--color-ink)',
                          border: 'none', cursor: 'pointer',
                          fontWeight: i18n.language === lang.code ? 600 : 400,
                        }}>
                        <span>{lang.native}</span>
                        <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <Link to="/notifications"
                className="relative p-2 rounded-lg transition-colors no-underline"
                style={{ color: 'var(--color-muted)' }}>
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                    style={{ background: 'var(--color-alert)', minWidth: 18, height: 18 }}>
                    {unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile */}
              <Link to="/profile"
                className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full no-underline transition-all duration-200"
                style={{
                  background: location.pathname === '/profile' ? 'var(--color-paddy-soft)' : 'var(--color-canvas)',
                  border: '1px solid var(--color-card-border)',
                }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'var(--color-turmeric)' }}>K</div>
                <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>Karthik</span>
              </Link>

              {/* Mobile Menu */}
              <button className="lg:hidden p-2 rounded-lg"
                style={{ color: 'var(--color-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X size={22} /> : <LayoutDashboard size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Primary Nav Dropdown */}
        {mobileOpen && (
          <div className="lg:hidden border-t px-4 py-4" style={{
            borderColor: 'var(--color-card-border)', background: 'var(--color-card)',
          }}>
            <div className="grid grid-cols-3 gap-2">
              {PRIMARY_NAV.map(({ path, icon: Icon, key }) => {
                const active = location.pathname === path
                return (
                  <Link key={path} to={path}
                    className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-medium no-underline text-center"
                    style={{
                      color: active ? 'var(--color-paddy)' : 'var(--color-ink)',
                      background: active ? 'var(--color-paddy-soft)' : 'var(--color-canvas)',
                    }}>
                    <Icon size={20} />
                    {t(key)}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </header>

      {/* ═══ SIDEBAR DRAWER ═══ */}
      {/* Backdrop */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setDrawerOpen(false)} />
      )}

      {/* Drawer Panel */}
      <aside
        className="fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300"
        style={{
          width: 280,
          background: 'var(--color-card)',
          borderRight: '1px solid var(--color-card-border)',
          boxShadow: drawerOpen ? '4px 0 25px rgba(0,0,0,0.15)' : 'none',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b"
          style={{ borderColor: 'var(--color-card-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--color-paddy), var(--color-paddy-soft))' }}>
              <Sprout size={22} color="#fff" />
            </div>
            <div>
              <div className="text-base font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                {t('app_name')}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Krishi Saarthi</div>
            </div>
          </div>
          <button onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-lg" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Primary Nav Links */}
        <div className="px-3 pt-4 pb-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-2"
            style={{ color: 'var(--color-muted)' }}>
            {t('nav.main') || 'Main'}
          </div>
          {PRIMARY_NAV.map(({ path, icon: Icon, key }) => {
            const active = location.pathname === path
            return (
              <Link key={path} to={path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium no-underline mb-0.5 transition-all"
                style={{
                  color: active ? 'var(--color-paddy)' : 'var(--color-ink)',
                  background: active ? 'var(--color-paddy-soft)' : 'transparent',
                }}>
                <Icon size={18} />
                {t(key)}
                {active && <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--color-paddy)' }} />}
              </Link>
            )
          })}
        </div>

        {/* Divider */}
        <div className="mx-5 my-2 border-t" style={{ borderColor: 'var(--color-card-border)' }} />

        {/* Secondary Nav Links */}
        <div className="px-3 pb-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-2"
            style={{ color: 'var(--color-muted)' }}>
            {t('nav.tools') || 'Tools & More'}
          </div>
          {SECONDARY_NAV.map(({ path, icon: Icon, key }) => {
            const active = location.pathname === path
            return (
              <Link key={path} to={path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium no-underline mb-0.5 transition-all"
                style={{
                  color: active ? 'var(--color-paddy)' : 'var(--color-ink)',
                  background: active ? 'var(--color-paddy-soft)' : 'transparent',
                }}>
                <Icon size={18} />
                {t(key)}
                {path === '/notifications' && unreadCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: 'var(--color-alert)' }}>{unreadCount}</span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Drawer Footer */}
        <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-canvas)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'var(--color-turmeric)' }}>K</div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Karthik</div>
              <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Sriperumbudur, TN</div>
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: 'transparent', color: 'var(--color-alert)',
              border: '1px solid var(--color-alert-soft)', cursor: 'pointer',
            }}>
            <LogOut size={14} /> {t('nav.logout')}
          </button>
        </div>
      </aside>
    </>
  )
}
