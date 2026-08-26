import { useTranslation } from 'react-i18next'
import { Droplets, ShieldAlert, Leaf, Users, Globe, Sparkles } from 'lucide-react'
import AnimatedCounter from '../components/AnimatedCounter'

const SDG_CARDS = [
  { sdg: 1, icon: '💰', title: 'impact.sdg1', color: '#E5243B', desc: 'Parametric insurance prevents income loss from crop failure, protecting 47,250+ farming families from extreme climate poverty.' },
  { sdg: 2, icon: '🌾', title: 'impact.sdg2', color: '#DDA63A', desc: 'AI-driven crop advisories improve yields by 15-25%, strengthening local food security and rural livelihoods.' },
  { sdg: 12, icon: '♻️', title: 'impact.sdg12', color: '#BF8B2E', desc: 'Precision irrigation nudges reduce water waste by 30%. Soil-based fertilizer prescriptions eliminate chemical runoff.' },
  { sdg: 13, icon: '🌍', title: 'impact.sdg13', color: '#3F7E44', desc: 'Real-time climate pattern analysis and early warnings empower smallholder farmers to adapt to extreme weather.' },
]

export default function Impact() {
  const { t } = useTranslation()

  const STATS = [
    { icon: Droplets, label: 'impact.water_saved', value: 284000, suffix: ' L', color: 'var(--color-rain)' },
    { icon: ShieldAlert, label: 'impact.loss_prevented', value: 1850000, suffix: '', prefix: '₹', color: 'var(--color-paddy)' },
    { icon: Users, label: 'impact.farmers_helped', value: 342, suffix: '', color: 'var(--color-turmeric)' },
    { icon: Globe, label: 'Carbon Sequestration (CO₂e)', value: 1420, suffix: ' tons', color: '#2D8A68', isCO2: true },
  ]

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="card p-8 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--color-paddy-soft) 0%, var(--color-card) 60%, var(--color-rain-soft) 100%)' }}>
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-sm" style={{ background: '#fff' }}>
          <Sparkles size={32} style={{ color: 'var(--color-paddy)' }} />
        </div>
        <h1 className="text-3xl sm:text-4xl mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          {t('impact.title')} 🌱
        </h1>
        <p className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {t('impact.subtitle')} — measure how precision AI advice and climate risk insurance build sustainable rural resilience.
        </p>
      </div>

      {/* Impact Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ icon: Icon, label, value, suffix, prefix, color, isCO2 }, i) => (
          <div key={i} className="card p-6 text-center transition-all hover:scale-[1.02]">
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${color}15` }}>
              <Icon size={24} style={{ color }} />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold" style={{ fontFamily: 'var(--font-display)', color }}>
              {prefix}<AnimatedCounter target={value} />{suffix}
            </div>
            <div className="text-xs font-semibold mt-2" style={{ color: 'var(--color-muted)' }}>
              {isCO2 ? (
                <span>Carbon Sequestration (CO₂e)</span>
              ) : (
                t(label)
              )}
            </div>
          </div>
        ))}
      </div>

      {/* SDG Cards */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <span>🇺🇳</span> UN Sustainable Development Goals Alignment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SDG_CARDS.map((card, i) => (
            <div key={i} className="card p-6 relative overflow-hidden transition-all hover:shadow-lg"
              style={{ borderTop: `4px solid ${card.color}` }}>
              <div className="flex items-center gap-4 mb-3">
                <span className="text-3xl">{card.icon}</span>
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: card.color }}>SDG {card.sdg}</div>
                  <h3 className="text-lg font-bold m-0" style={{ fontFamily: 'var(--font-display)' }}>{t(card.title)}</h3>
                </div>
              </div>
              <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--color-muted)' }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
