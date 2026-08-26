import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Shield, Leaf, CloudRain, Thermometer, AlertTriangle, Download, Info, CheckCircle, XCircle, HelpCircle, FileText, Sparkles, Loader2 } from 'lucide-react'
import AnimatedCounter from '../components/AnimatedCounter'

const DEMO_FARMS = [
  { id: 1, name: 'Main Paddy Field', crops: [{ id: 1, name: 'Paddy — ADT-43', stage: 'Tillering' }] },
  { id: 2, name: 'Groundnut Plot', crops: [{ id: 2, name: 'Groundnut — TMV-7', stage: 'Pegging' }] },
]

const DEMO_ASSESSMENT = {
  ndvi_now: 0.38, ndvi_base: 0.72, ndvi_stress: 47.2,
  rain_actual: 285, rain_expected: 180, rain_stress: 0,
  heat_days: 5, heat_total: 30, heat_stress: 16.7,
  loss_pct: 31.5, threshold: 20, eligible: true,
  sum_insured: 150000, premium: 3000, payout: 47250,
  scheme: 'PMFBY Kharif', premium_rate: '2%',
  hash: 'a3f8b2c1d4e5f67890abcdef12345678abcdef1234567890abcdef1234567890',
  veg_health: 'Stressed', veg_color: 'var(--color-alert)',
}

const WEIGHTS = { ndvi: 0.55, rain: 0.30, heat: 0.15 }

export default function Insurance() {
  const { t } = useTranslation()
  const [selectedFarm, setSelectedFarm] = useState('')
  const [selectedCrop, setSelectedCrop] = useState('')
  const [assessed, setAssessed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showWhy, setShowWhy] = useState(false)
  const d = DEMO_ASSESSMENT

  const runAssessment = () => {
    setLoading(true)
    setTimeout(() => { setAssessed(true); setLoading(false) }, 2000)
  }

  const ndviPct = (d.ndvi_now / 1) * 100
  const basePct = (d.ndvi_base / 1) * 100

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl" style={{ fontFamily: 'var(--font-display)' }}>{t('insurance.title')} 🛡️</h1>

      {/* Farm + Crop Selector */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>{t('insurance.select_farm')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <select className="input" value={selectedFarm} onChange={e => { setSelectedFarm(e.target.value); setSelectedCrop(''); setAssessed(false) }}>
            <option value="">Select Farm...</option>
            {DEMO_FARMS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select className="input" value={selectedCrop} onChange={e => { setSelectedCrop(e.target.value); setAssessed(false) }} disabled={!selectedFarm}>
            <option value="">Select Crop...</option>
            {DEMO_FARMS.find(f => f.id === Number(selectedFarm))?.crops.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.stage})</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary w-full py-3" disabled={!selectedCrop || loading} onClick={runAssessment}>
          {loading ? <><Loader2 size={16} className="animate-spin" /> Running Assessment...</> : <><Shield size={16} /> Run Parametric Assessment</>}
        </button>
      </div>

      {assessed && (
        <div className="space-y-5" style={{ animation: 'fade-up 0.5s var(--ease-monsoon) forwards' }}>
          {/* NDVI Gauge */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold m-0" style={{ fontFamily: 'var(--font-display)' }}>
                <Leaf size={16} className="inline mr-1" style={{ color: 'var(--color-paddy)' }} /> {t('insurance.ndvi_gauge')}
              </h3>
              <span className="chip text-xs" style={{ background: d.veg_color + '20', color: d.veg_color }}>{d.veg_health}</span>
            </div>
            <div className="flex items-center gap-8 flex-wrap">
              {/* Gauge Circle */}
              <div className="relative w-32 h-32 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-card-border)" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={d.ndvi_now > 0.5 ? 'var(--color-paddy)' : d.ndvi_now > 0.3 ? 'var(--color-turmeric)' : 'var(--color-alert)'}
                    strokeWidth="2.5" strokeDasharray={`${ndviPct} ${100 - ndviPct}`} strokeLinecap="round" className="transition-all duration-1000" />
                  {/* Baseline indicator */}
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-paddy)" strokeWidth="1" strokeDasharray={`1 ${100 - 1}`}
                    strokeDashoffset={-basePct} opacity="0.5" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: d.ndvi_now > 0.5 ? 'var(--color-paddy)' : 'var(--color-alert)' }}>{d.ndvi_now}</span>
                  <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>NDVI</span>
                </div>
              </div>
              {/* Comparison */}
              <div className="flex-1 space-y-3">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-muted)' }}>Current NDVI</span>
                  <span className="font-bold" style={{ color: 'var(--color-alert)' }}>{d.ndvi_now}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-muted)' }}>{t('insurance.baseline')}</span>
                  <span className="font-bold" style={{ color: 'var(--color-paddy)' }}>{d.ndvi_base}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-muted)' }}>NDVI Stress</span>
                  <span className="font-bold" style={{ color: 'var(--color-alert)' }}>{d.ndvi_stress}%</span>
                </div>
                <div className="vine-bar mt-2">
                  <div className="h-full rounded-full" style={{
                    width: `${d.ndvi_stress}%`, background: 'linear-gradient(90deg, var(--color-turmeric), var(--color-alert))',
                    animation: 'vine-grow 1.5s var(--ease-monsoon) forwards', transformOrigin: 'left',
                  }} />
                </div>
                <div className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Source: Synthetic NDVI (crop-curve × rain × temp × soil)</div>
              </div>
            </div>
          </div>

          {/* Loss Model — 3 Stress Bars */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold m-0" style={{ fontFamily: 'var(--font-display)' }}>{t('insurance.loss_model')}</h3>
              <button onClick={() => setShowWhy(!showWhy)} className="btn btn-ghost text-xs py-1 px-2">
                <HelpCircle size={13} /> {t('insurance.why_this_number')}
              </button>
            </div>

            <div className="space-y-4">
              {[
                { icon: Leaf, label: `${t('insurance.ndvi_stress')} (w=${WEIGHTS.ndvi})`, value: d.ndvi_stress, color: 'var(--color-paddy)', weight: WEIGHTS.ndvi },
                { icon: CloudRain, label: `${t('insurance.rain_stress')} (w=${WEIGHTS.rain})`, value: d.rain_stress, color: 'var(--color-rain)', weight: WEIGHTS.rain },
                { icon: Thermometer, label: `${t('insurance.heat_stress')} (w=${WEIGHTS.heat})`, value: d.heat_stress, color: 'var(--color-laterite)', weight: WEIGHTS.heat },
              ].map(({ icon: Icon, label, value, color, weight }, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5"><Icon size={14} style={{ color }} /> {label}</span>
                    <span className="font-bold">{value.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-card-border)' }}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${value}%`, background: color, animation: 'ndvi-bar 1s var(--ease-monsoon) forwards', transformOrigin: 'left' }} />
                  </div>
                </div>
              ))}

              {/* Total Loss */}
              <div className="p-4 rounded-xl mt-2" style={{ background: d.eligible ? 'var(--color-alert-soft)' : 'var(--color-paddy-soft)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold flex items-center gap-1.5">
                    {d.eligible ? <AlertTriangle size={16} style={{ color: 'var(--color-alert)' }} /> : <CheckCircle size={16} style={{ color: 'var(--color-paddy)' }} />}
                    {t('insurance.total_loss')}
                  </span>
                  <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-alert)' }}>
                    {d.loss_pct.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                  {t('insurance.threshold')}: {d.threshold}% · Formula: 0.55×NDVI + 0.30×Rain + 0.15×Heat
                </div>
              </div>
            </div>

            {/* Why This Number */}
            {showWhy && (
              <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: 'var(--color-turmeric-soft)', border: '1px solid var(--color-turmeric)33' }}>
                <h4 className="font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-turmeric)' }}>
                  <Info size={14} /> {t('insurance.why_this_number')}
                </h4>
                <ul className="list-none p-0 m-0 space-y-1 text-xs">
                  <li><strong>NDVI Stress (55%):</strong> Satellite vegetation index dropped from {d.ndvi_base} to {d.ndvi_now}, indicating {d.ndvi_stress}% plant health decline.</li>
                  <li><strong>Rain Stress (30%):</strong> Received {d.rain_actual}mm vs expected {d.rain_expected}mm — excess rainfall caused waterlogging (stress = 0%).</li>
                  <li><strong>Heat Stress (15%):</strong> {d.heat_days} out of {d.heat_total} days exceeded crop heat threshold ({d.heat_stress}% stress).</li>
                  <li className="pt-1"><strong>Total:</strong> (0.55 × {d.ndvi_stress}) + (0.30 × {d.rain_stress}) + (0.15 × {d.heat_stress}) = <strong>{d.loss_pct}%</strong></li>
                </ul>
              </div>
            )}
          </div>

          {/* Eligibility & Payout */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{t('insurance.sum_insured')}</div>
              <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>₹<AnimatedCounter target={d.sum_insured} /></div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{t('insurance.premium')} ({d.premium_rate})</div>
              <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-rain)' }}>₹<AnimatedCounter target={d.premium} /></div>
            </div>
            <div className="card p-4 text-center" style={{ background: d.eligible ? 'var(--color-paddy-soft)' : 'var(--color-card)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{t('insurance.payout')}</div>
              <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-paddy)' }}>
                {d.eligible ? <>₹<AnimatedCounter target={d.payout} /></> : '—'}
              </div>
              <div className="mt-1">
                {d.eligible
                  ? <span className="chip chip-healthy text-[10px]"><CheckCircle size={10} /> {t('insurance.eligible')}</span>
                  : <span className="chip chip-danger text-[10px]"><XCircle size={10} /> {t('insurance.not_eligible')}</span>
                }
              </div>
            </div>
          </div>

          {/* Evidence Hash + Download */}
          <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
              <span className="font-semibold">{t('insurance.evidence_hash')}:</span> <code className="text-[10px]">{d.hash.slice(0, 24)}...</code>
            </div>
            <button className="btn btn-primary text-sm"><Download size={15} /> {t('insurance.generate_claim')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
